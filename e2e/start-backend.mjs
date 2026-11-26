// Starts the real backend for e2e on a fresh `sport_e2e` database (never sport_dev).
// Used as Playwright's webServer command, so every run starts from the same seeded shop.
import { execSync, spawn } from 'node:child_process';
import { resolve } from 'node:path';
import pg from 'pg';

const backend = resolve(process.env.BACKEND_DIR ?? '../sport-backend');
const admin = process.env.E2E_PG_ADMIN_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres';
const dbUrl = process.env.E2E_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/sport_e2e';
const port = process.env.E2E_API_PORT ?? '3100';

const client = new pg.Client({ connectionString: admin });
await client.connect();
await client.query('drop database if exists sport_e2e with (force)');
await client.query('create database sport_e2e');
await client.end();

const env = {
  ...process.env,
  NODE_ENV: 'development',
  DATABASE_URL: dbUrl,
  DATABASE_SSL: 'false',
  COOKIE_SECRET: 'e2e-cookie-secret-0123456789abcdef0123',
  CORS_ORIGINS: 'http://localhost:4173',
  AUTH_TEST_MODE: 'true',
  PORT: port,
  PUBLIC_API_URL: `http://localhost:${port}`,
  LOG_LEVEL: 'warn',
};
for (const step of ['src/db/migrate.ts', 'src/db/seed/run.ts', 'src/db/seed/importCatalog.ts']) {
  execSync(`npx tsx ${step}`, { cwd: backend, env, stdio: 'inherit' });
}
const db = new pg.Client({ connectionString: dbUrl });
await db.connect();
await db.query(`update settings set value = '{"aba_khqr":true,"card":true,"acleda":false,"wing":false,"cash_on_pickup":true}' where key = 'payment_methods_enabled'`);
await db.end();

const server = spawn('npx', ['tsx', 'src/server.ts'], { cwd: backend, env, stdio: 'inherit' });
const stop = () => server.kill('SIGTERM');
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
server.on('exit', (code) => process.exit(code ?? 0));
