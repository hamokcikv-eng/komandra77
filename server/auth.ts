import type { MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { AppContext, AppEnv, SessionUser } from './types';
import { fail, randomToken } from './http';

const ENCODER = new TextEncoder();
const SESSION_COOKIE = 'kom_sess';
const SESSION_DAYS = 30;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function derive(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  return crypto.subtle
    .importKey('raw', ENCODER.encode(password), 'PBKDF2', false, ['deriveBits'])
    .then((key) =>
      crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' }, key, 256),
    );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await derive(password, salt, 120_000);
  return `pbkdf2$120000$${toBase64(salt)}$${toBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 1000) return false;
  const salt = fromBase64(parts[2]);
  const expected = fromBase64(parts[3]);
  const actual = new Uint8Array(await derive(password, salt, iterations));
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

export function passwordProblem(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 200) return 'Password is too long';
  if (!/[a-zA-Z]/.test(password)) return 'Password must include a letter';
  if (!/[0-9]/.test(password)) return 'Password must include a number';
  return null;
}

export async function createSession(c: AppContext, userId: number): Promise<void> {
  const token = randomToken(32);
  await c.env.DB.prepare(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', ?))",
  ).bind(token, userId, `+${SESSION_DAYS} days`).run();

  const secure = new URL(c.req.url).protocol === 'https:';
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(c: AppContext): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

export async function sessionUser(c: AppContext): Promise<SessionUser | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  const row = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.phone, u.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > datetime('now')`,
  ).bind(token).first<SessionUser>();
  return row ?? null;
}

export const withUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('user', await sessionUser(c));
  await next();
};

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get('user') ?? (await sessionUser(c));
  if (!user) fail(401, 'Please sign in to continue');
  c.set('user', user);
  await next();
};

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get('user') ?? (await sessionUser(c));
  if (!user) fail(401, 'Please sign in to continue');
  if (user.role !== 'admin') fail(403, 'Administrator access required');
  c.set('user', user);
  await next();
};
