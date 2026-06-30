import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migrationsDir = resolve(root, 'supabase/migrations');
const envPath = resolve(root, '.env');

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error('Missing .env — run pnpm setup first.');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

async function tableExists(supabase, table) {
  const { error } = await supabase.from(table).select('id').limit(0);
  if (!error) return true;
  const msg = error.message.toLowerCase();
  if (
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    error.code === '42P01' ||
    error.code === 'PGRST205'
  ) {
    return false;
  }
  throw new Error(`Could not check ${table}: ${error.message}`);
}

async function applyWithPg(dbUrl, files) {
  const { default: pg } = await import('pg');
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    for (const file of files) {
      const sql = readFileSync(resolve(migrationsDir, file), 'utf8');
      console.log(`Applying ${file}…`);
      await client.query(sql);
      console.log(`  ✓ ${file}`);
    }
  } finally {
    await client.end();
  }
}

function resolveDbUrl(env) {
  if (env.DATABASE_URL || env.SUPABASE_DB_URL) {
    return env.DATABASE_URL ?? env.SUPABASE_DB_URL;
  }
  const password = env.SUPABASE_DB_PASSWORD;
  const match = (env.NEXT_PUBLIC_SUPABASE_URL ?? '').match(
    /https:\/\/([^.]+)\.supabase\.co/,
  );
  const ref = match?.[1];
  if (!password || !ref) return null;

  const host = env.SUPABASE_DB_HOST ?? 'aws-0-us-east-1.pooler.supabase.com';
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${host}:6543/postgres`;
}

const env = loadEnv();
const dbUrl = resolveDbUrl(env);

if (!existsSync(migrationsDir)) {
  console.error(`Migrations folder not found: ${migrationsDir}`);
  process.exit(1);
}

const allFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

let filesToApply = allFiles;

if (url && serviceKey) {
  const supabase = createClient(url, serviceKey);
  const hasDocuments = await tableExists(supabase, 'documents');
  const hasUsage = await tableExists(supabase, 'usage_events');

  if (hasUsage) {
    console.log('usage_events already exists — nothing to migrate.');
    process.exit(0);
  }

  if (hasDocuments) {
    filesToApply = allFiles.filter((f) => f.includes('summary_and_usage'));
    console.log('Init schema detected — applying pending migration(s) only.');
  }
}

if (filesToApply.length === 0) {
  console.log('No migration files to apply.');
  process.exit(0);
}

if (!dbUrl) {
  console.error(`
Cannot apply migrations automatically: set DATABASE_URL, SUPABASE_DB_URL, or SUPABASE_DB_PASSWORD in .env.

Dashboard → Project Settings → Database → Connection string (URI or password), then re-run:

  pnpm db:migrate

Or paste this file into the Supabase SQL Editor:
  supabase/migrations/20250630000000_summary_and_usage.sql
`);
  process.exit(1);
}

console.log(`Applying ${filesToApply.length} migration(s) via Postgres…`);
try {
  await applyWithPg(dbUrl, filesToApply);
  console.log('Migrations applied successfully.');
} catch (err) {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
}
