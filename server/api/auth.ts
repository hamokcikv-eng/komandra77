import { Hono } from 'hono';
import type { AppEnv, SessionUser } from '../types';
import { body, fail, int, txt } from '../http';
import {
  createSession,
  destroySession,
  hashPassword,
  passwordProblem,
  requireUser,
  verifyPassword,
} from '../auth';

export const authRoutes = new Hono<AppEnv>();

const attempts = new Map<string, { count: number; resetAt: number }>();

function throttle(key: string, limit = 8): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return;
  }
  entry.count += 1;
  if (entry.count > limit) fail(429, 'Too many attempts. Please wait a few minutes and try again.');
}

function clientKey(c: { req: { header: (name: string) => string | undefined } }, suffix: string): string {
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'local';
  return `${ip}:${suffix}`;
}

authRoutes.post('/auth/register', async (c) => {
  const payload = await body(c);
  const name = txt(payload.name, 'Name', { min: 2, max: 120 });
  const email = txt(payload.email, 'Email', { email: true, max: 160 }).toLowerCase();
  const phone = txt(payload.phone, 'Phone', { optional: true, max: 30 });
  const password = txt(payload.password, 'Password', { min: 8, max: 200 });
  throttle(clientKey(c, 'register'), 6);

  const problem = passwordProblem(password);
  if (problem) fail(422, problem);

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: number }>();
  if (existing) fail(409, 'An account with that email already exists');

  const passwordHash = await hashPassword(password);
  const created = await c.env.DB.prepare(
    "INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'customer') RETURNING id, name, email, phone, role",
  )
    .bind(name, email, phone || null, passwordHash)
    .first<SessionUser>();

  if (!created) fail(500, 'Could not create your account');
  await createSession(c, created.id);
  return c.json({ user: created }, 201);
});

authRoutes.post('/auth/login', async (c) => {
  const payload = await body(c);
  const email = txt(payload.email, 'Email', { email: true, max: 160 }).toLowerCase();
  const password = txt(payload.password, 'Password', { min: 1, max: 200 });
  throttle(clientKey(c, `login:${email}`), 8);

  const row = await c.env.DB.prepare(
    'SELECT id, name, email, phone, role, password_hash FROM users WHERE email = ?',
  )
    .bind(email)
    .first<SessionUser & { password_hash: string }>();

  const valid = row ? await verifyPassword(password, row.password_hash) : false;
  if (!row || !valid) fail(401, 'Email or password is incorrect');

  await createSession(c, row.id);
  return c.json({ user: { id: row.id, name: row.name, email: row.email, phone: row.phone, role: row.role } });
});

authRoutes.post('/auth/logout', async (c) => {
  await destroySession(c);
  return c.json({ ok: true });
});

authRoutes.get('/auth/me', async (c) => {
  const user = c.get('user') ?? null;
  if (!user) return c.json({ user: null, addresses: [], stats: { orders: 0, spentCents: 0 } });

  const [addresses, stats] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC')
      .bind(user.id)
      .all<Record<string, unknown>>(),
    c.env.DB.prepare(
      "SELECT COUNT(*) AS orders, COALESCE(SUM(total_cents), 0) AS spent FROM orders WHERE user_id = ? AND status != 'cancelled'",
    )
      .bind(user.id)
      .first<{ orders: number; spent: number }>(),
  ]);

  return c.json({
    user,
    addresses: (addresses.results ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      line1: row.line1,
      line2: row.line2,
      city: row.city,
      notes: row.notes,
      isDefault: row.is_default === 1,
    })),
    stats: { orders: stats?.orders ?? 0, spentCents: stats?.spent ?? 0 },
  });
});

authRoutes.patch('/auth/me', requireUser, async (c) => {
  const user = c.get('user') as SessionUser;
  const payload = await body(c);
  const name = txt(payload.name, 'Name', { min: 2, max: 120 });
  const phone = txt(payload.phone, 'Phone', { optional: true, max: 30 });

  await c.env.DB.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').bind(name, phone || null, user.id).run();
  return c.json({ user: { ...user, name, phone: phone || null } });
});

authRoutes.post('/auth/password', requireUser, async (c) => {
  const user = c.get('user') as SessionUser;
  const payload = await body(c);
  const current = txt(payload.currentPassword, 'Current password', { min: 1 });
  const next = txt(payload.newPassword, 'New password', { min: 8, max: 200 });
  const problem = passwordProblem(next);
  if (problem) fail(422, problem);
  throttle(clientKey(c, `pw:${user.id}`), 6);

  const row = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first<{ password_hash: string }>();
  if (!row || !(await verifyPassword(current, row.password_hash))) fail(401, 'Current password is incorrect');

  const passwordHash = await hashPassword(next);
  await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(passwordHash, user.id).run();
  if (user.role === 'admin') {
    await c.env.DB.prepare("DELETE FROM settings WHERE key = 'admin_default_password'").run();
  }
  return c.json({ ok: true });
});

authRoutes.post('/addresses', requireUser, async (c) => {
  const user = c.get('user') as SessionUser;
  const payload = await body(c);
  const label = txt(payload.label, 'Label', { optional: true, max: 40 }) || 'Home';
  const line1 = txt(payload.line1, 'Address', { min: 4, max: 200 });
  const line2 = txt(payload.line2, 'Building / notes', { optional: true, max: 140 });
  const city = txt(payload.city, 'City', { min: 2, max: 80 });
  const notes = txt(payload.notes, 'Delivery notes', { optional: true, max: 200 });
  const isDefault = payload.isDefault ? 1 : 0;

  const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM addresses WHERE user_id = ?').bind(user.id).first<{ n: number }>();
  const makeDefault = isDefault || (count?.n ?? 0) === 0 ? 1 : 0;
  if (makeDefault) {
    await c.env.DB.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').bind(user.id).run();
  }

  const created = await c.env.DB.prepare(
    'INSERT INTO addresses (user_id, label, line1, line2, city, notes, is_default) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
  )
    .bind(user.id, label, line1, line2 || null, city, notes || null, makeDefault)
    .first<{ id: number }>();

  return c.json({ address: { id: created?.id, label, line1, line2, city, notes, isDefault: makeDefault === 1 } }, 201);
});

authRoutes.delete('/addresses/:id', requireUser, async (c) => {
  const user = c.get('user') as SessionUser;
  const id = int(c.req.param('id'), 'Address', { min: 1 });
  await c.env.DB.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').bind(id, user.id).run();
  return c.json({ ok: true });
});

authRoutes.post('/addresses/:id/default', requireUser, async (c) => {
  const user = c.get('user') as SessionUser;
  const id = int(c.req.param('id'), 'Address', { min: 1 });
  const owned = await c.env.DB.prepare('SELECT id FROM addresses WHERE id = ? AND user_id = ?').bind(id, user.id).first<{ id: number }>();
  if (!owned) fail(404, 'Address not found');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').bind(user.id),
    c.env.DB.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').bind(id),
  ]);
  return c.json({ ok: true });
});
