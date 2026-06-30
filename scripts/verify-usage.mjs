import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHmac } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
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

function projectRefFromUrl(url) {
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

function resolveDbUrl(env) {
  if (env.DATABASE_URL || env.SUPABASE_DB_URL) {
    return env.DATABASE_URL ?? env.SUPABASE_DB_URL;
  }
  const password = env.SUPABASE_DB_PASSWORD;
  const ref = projectRefFromUrl(env.NEXT_PUBLIC_SUPABASE_URL ?? '');
  if (!password || !ref) return null;

  const host = env.SUPABASE_DB_HOST ?? `aws-0-us-east-1.pooler.supabase.com`;
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${host}:6543/postgres`;
}

async function tableExists(supabase, table) {
  const { error } = await supabase.from(table).select('id').limit(0);
  if (!error) return true;
  const msg = error.message.toLowerCase();
  return !(
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    error.code === '42P01' ||
    error.code === 'PGRST205'
  );
}

function mintUserJwt(userId, secret) {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      aud: 'authenticated',
      role: 'authenticated',
      iss: 'supabase',
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url');
  const sig = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const apiUrl = env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const hasUsage = await tableExists(supabase, 'usage_events');
console.log(`usage_events table: ${hasUsage ? 'present' : 'MISSING'}`);

const { data: users, error: usersError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1,
});
if (usersError || !users.users[0]) {
  console.error('Could not list users for API check:', usersError?.message ?? 'no users');
  process.exit(1);
}

const userId = users.users[0].id;
const token = mintUserJwt(userId, env.SUPABASE_JWT_SECRET);
const res = await fetch(`${apiUrl}/usage`, {
  headers: { Authorization: `Bearer ${token}` },
});
const body = await res.text();

console.log(`GET /usage → ${res.status}`);
console.log(body.slice(0, 240));

if (!hasUsage) {
  console.error('\nRun: pnpm db:migrate (requires DATABASE_URL or SUPABASE_DB_PASSWORD in .env)');
  process.exit(1);
}

if (res.status !== 200) {
  console.error('\nExpected 200 after migration; check API logs.');
  process.exit(1);
}

const summary = JSON.parse(body);
if (
  typeof summary.totalTokens !== 'number' ||
  typeof summary.totalEvents !== 'number' ||
  !Array.isArray(summary.byKind) ||
  !Array.isArray(summary.recent)
) {
  console.error('\nUnexpected /usage response shape.');
  process.exit(1);
}

console.log('\nUsage tracking OK (schema present, GET /usage returns summary).');
