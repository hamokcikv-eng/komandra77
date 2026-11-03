import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from './types';
import { api } from './api';
import { ensureDb } from './db';
import { withUser } from './auth';

const app = new Hono<AppEnv>();

app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'SAMEORIGIN');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
});

app.use('/api/*', async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    const origin = c.req.header('origin');
    if (origin) {
      const expected = new URL(c.req.url).origin;
      if (origin !== expected) return c.json({ error: 'Cross-site request blocked' }, 403);
    }
  }
  await next();
});

app.use('/api/*', async (c, next) => {
  await ensureDb(c.env);
  await next();
});

app.use('/api/*', withUser);

app.use('/api/*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
});

app.route('/api', api);

app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

app.notFound((c) => {
  if (new URL(c.req.url).pathname.startsWith('/api/')) {
    return c.json({ error: 'Endpoint not found' }, 404);
  }
  return c.env.ASSETS.fetch(c.req.raw);
});

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status);
  }
  console.error('Unhandled error', error);
  if (new URL(c.req.url).pathname.startsWith('/api/')) {
    return c.json({ error: 'Something went wrong on our side. Please try again.' }, 500);
  }
  return new Response('Something went wrong', { status: 500 });
});

export default app;
