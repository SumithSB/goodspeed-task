import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const envExample = resolve(root, '.env.example');
const envTarget = resolve(root, '.env');
const webEnv = resolve(root, 'apps/web/.env.local');
const migrationsDir = resolve(root, 'supabase/migrations');

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_JWT_SECRET',
  'AI_API_KEY',
];

if (!existsSync(envExample)) {
  console.error('.env.example not found');
  process.exit(1);
}

if (!existsSync(envTarget)) {
  copyFileSync(envExample, envTarget);
  console.log('Created .env from .env.example');
} else {
  console.log('.env already exists — skipped copy');
}

copyFileSync(envTarget, webEnv);
console.log('Synced .env → apps/web/.env.local');

const apiEnv = resolve(root, 'apps/api/.env');
copyFileSync(envTarget, apiEnv);
console.log('Synced .env → apps/api/.env');

const envContent = await import('node:fs').then((fs) =>
  fs.readFileSync(envTarget, 'utf8'),
);
const missing = required.filter(
  (key) => !new RegExp(`^${key}=.+`, 'm').test(envContent),
);

if (missing.length > 0) {
  console.warn('\nMissing or empty required variables:');
  missing.forEach((k) => console.warn(`  - ${k}`));
  console.warn('\nFill these in .env, then re-run pnpm setup.');
} else {
  console.log('All required env vars are set.');
}

const migrationFiles = existsSync(migrationsDir)
  ? readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
  : [];

console.log('\n── Next steps ──');
console.log('1. Fill .env (see README → Environment variables)');
if (migrationFiles.length > 0) {
  console.log('2. Apply Supabase migrations in order:');
  migrationFiles.forEach((f, i) => console.log(`     ${i + 1}. supabase/migrations/${f}`));
  console.log('   (SQL Editor paste, or pnpm db:migrate with DATABASE_URL / SUPABASE_DB_PASSWORD)');
  console.log('3. pnpm db:verify-usage   # confirm usage_events + GET /usage');
  console.log('4. pnpm dev');
} else {
  console.log('2. pnpm dev');
}
console.log('\nFull instructions: README.md → Setup (reviewer instructions)');
