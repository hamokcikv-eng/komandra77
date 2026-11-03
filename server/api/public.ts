import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { body, fail, int, txt } from '../http';
import { settingsMap } from '../db';

export const publicRoutes = new Hono<AppEnv>();

publicRoutes.get('/health', (c) => c.json({ ok: true, service: 'komandra', time: new Date().toISOString() }));

publicRoutes.post('/reservations', async (c) => {
  const payload = await body(c);
  const name = txt(payload.name, 'Name', { min: 2, max: 120 });
  const phone = txt(payload.phone, 'Phone', { min: 6, max: 26, pattern: /^\+?[0-9][0-9\s()-]{5,24}$/ });
  const email = txt(payload.email, 'Email', { email: true, optional: true, max: 160 });
  const partySize = int(payload.partySize, 'Party size', { min: 1, max: 20 });
  const date = txt(payload.date, 'Date', { min: 8, max: 30, pattern: /^\d{4}-\d{2}-\d{2}$/ });
  const time = txt(payload.time, 'Time', { min: 4, max: 10, pattern: /^\d{1,2}:\d{2}$/ });
  const notes = txt(payload.notes, 'Notes', { optional: true, max: 400 });

  const when = new Date(`${date}T${time.padStart(5, '0')}:00`);
  if (Number.isNaN(when.getTime())) fail(422, 'That date or time is not valid');
  if (when.getTime() < Date.now() - 60_000) fail(422, 'Choose a date in the future');

  const created = await c.env.DB.prepare(
    'INSERT INTO reservations (name, phone, email, party_size, date, time, notes) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
  )
    .bind(name, phone, email || null, partySize, date, time, notes || null)
    .first<{ id: number }>();

  if (!created) fail(500, 'Could not save your reservation. Please try again.');

  const settings = await settingsMap(c.env);
  const whatsapp = (settings.whatsapp ?? '').replace(/[^0-9]/g, '');
  return c.json(
    {
      reservation: { id: created.id, date, time, partySize, status: 'pending' },
      whatsappUrl: whatsapp
        ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
            `Hello KOMANDRA, I'd like to confirm a table for ${partySize} on ${date} at ${time} under ${name}.`,
          )}`
        : '',
    },
    201,
  );
});

publicRoutes.post('/contact', async (c) => {
  const payload = await body(c);
  const name = txt(payload.name, 'Name', { min: 2, max: 120 });
  const phone = txt(payload.phone, 'Phone', { optional: true, max: 26 });
  const email = txt(payload.email, 'Email', { email: true, max: 160 });
  const message = txt(payload.message, 'Message', { min: 10, max: 2000 });

  await c.env.DB.prepare('INSERT INTO messages (name, phone, email, message) VALUES (?, ?, ?, ?)')
    .bind(name, phone || null, email, message)
    .run();

  return c.json({ ok: true }, 201);
});
