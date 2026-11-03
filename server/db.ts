import type { Env } from './types';
import schemaSql from './schema.sql';
import { seedDatabase } from './seed';

const globalState = globalThis as unknown as { __komandraDb?: Promise<void> };

function schemaStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function initialise(env: Env): Promise<void> {
  const statements = schemaStatements(schemaSql);
  for (let index = 0; index < statements.length; index += 12) {
    const chunk = statements.slice(index, index + 12);
    await env.DB.batch(chunk.map((statement) => env.DB.prepare(statement)));
  }

  const claim = await env.DB.prepare(
    "INSERT INTO meta (key, value) VALUES ('seeded', '1') ON CONFLICT(key) DO NOTHING",
  ).run();

  if ((claim.meta?.changes ?? 0) === 0) return;

  try {
    await seedDatabase(env);
  } catch (error) {
    // Release the claim so the next isolate can retry seeding.
    await env.DB.prepare("DELETE FROM meta WHERE key = 'seeded'").run();
    throw error;
  }
}

/** Idempotent schema + seed bootstrap, memoised per isolate. */
export function ensureDb(env: Env): Promise<void> {
  if (!globalState.__komandraDb) {
    globalState.__komandraDb = initialise(env).catch((error) => {
      globalState.__komandraDb = undefined;
      throw error;
    });
  }
  return globalState.__komandraDb;
}

export async function setting(env: Env, key: string, fallback = ''): Promise<string> {
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>();
  return row?.value ?? fallback;
}

export async function settingsMap(env: Env): Promise<Record<string, string>> {
  const { results } = await env.DB.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
  const map: Record<string, string> = {};
  for (const row of results ?? []) map[row.key] = row.value;
  return map;
}

export async function setSetting(env: Env, key: string, value: string): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).bind(key, value).run();
}
