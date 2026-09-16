import { execSync } from 'node:child_process';
import { config } from 'dotenv';

// Wipe and rebuild the test schema, then reseed it once for the whole run.
export default async function setup() {
  const env = { ...process.env, ...(config({ path: '.env' }).parsed || {}) };
  const testUrl = env.TEST_DATABASE_URL || env.DATABASE_URL;

  execSync('npx prisma db push --force-reset', {
    env: { ...env, DATABASE_URL: testUrl },
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  execSync('npx ts-node prisma/seed.ts', {
    env: { ...env, DATABASE_URL: testUrl },
    stdio: 'inherit',
    cwd: process.cwd(),
  });
} // eslint-disable-line