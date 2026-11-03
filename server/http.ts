import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export function fail(status: number, message: string): never {
  throw new HTTPException(status as ContentfulStatusCode, { message });
}

type TextOpts = {
  min?: number;
  max?: number;
  optional?: boolean;
  email?: boolean;
  pattern?: RegExp;
};

export function txt(value: unknown, label: string, opts: TextOpts = {}): string {
  if (value === undefined || value === null) {
    if (opts.optional) return '';
    fail(422, `${label} is required`);
  }
  if (typeof value !== 'string') fail(422, `${label} must be text`);
  const v = value.trim();
  if (!v) {
    if (opts.optional) return '';
    fail(422, `${label} is required`);
  }
  if (opts.min && v.length < opts.min) fail(422, `${label} must be at least ${opts.min} characters`);
  const max = opts.max ?? 400;
  if (v.length > max) fail(422, `${label} must be under ${max} characters`);
  if (opts.email && !/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(v)) fail(422, `${label} must be a valid email address`);
  if (opts.pattern && !opts.pattern.test(v)) fail(422, `${label} is not in a valid format`);
  return v;
}

export function int(value: unknown, label: string, opts: { min?: number; max?: number; optional?: boolean; fallback?: number } = {}): number {
  if (value === undefined || value === null || value === '') {
    if (opts.optional) return opts.fallback ?? 0;
    fail(422, `${label} is required`);
  }
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) fail(422, `${label} must be a number`);
  const rounded = Math.round(n);
  if (opts.min !== undefined && rounded < opts.min) fail(422, `${label} must be at least ${opts.min}`);
  if (opts.max !== undefined && rounded > opts.max) fail(422, `${label} must be at most ${opts.max}`);
  return rounded;
}

/** Accepts a decimal amount (e.g. 42.5) and returns integer cents. */
export function money(value: unknown, label: string, opts: { min?: number; optional?: boolean } = {}): number {
  if (value === undefined || value === null || value === '') {
    if (opts.optional) return 0;
    fail(422, `${label} is required`);
  }
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(n)) fail(422, `${label} must be a number`);
  const cents = Math.round(n * 100);
  if (cents < 0) fail(422, `${label} cannot be negative`);
  if (opts.min !== undefined && cents < opts.min) fail(422, `${label} is below the allowed minimum`);
  return cents;
}

export function bool(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const v = String(value).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export function json<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function slugify(value: string, fallback = 'item'): string {
  const s = value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || fallback;
}

const CODE_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY23456789';

export function randomCode(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

export function randomToken(bytes = 32): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(bytes))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export async function body(c: { req: { json: () => Promise<unknown> } }): Promise<Record<string, unknown>> {
  try {
    const data = await c.req.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail(400, 'Expected a JSON object');
    return data as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    fail(400, 'Invalid JSON body');
  }
}

export function bearerOrNull(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1] : null;
}
