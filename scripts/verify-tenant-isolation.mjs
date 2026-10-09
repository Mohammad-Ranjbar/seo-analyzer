import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const databaseUrl = process.env.DATABASE_TEST_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_TEST_URL is required for tenant-isolation tests.');
}

const parsedUrl = new URL(databaseUrl);
const databaseName = parsedUrl.pathname.slice(1);
if (!databaseName.endsWith('_test')) {
  throw new Error('DATABASE_TEST_URL must name a database ending in _test.');
}

const testFile = fileURLToPath(new URL('../test/database/tenant-isolation.sql', import.meta.url));

execFileSync('psql', ['--dbname', databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', testFile], {
  stdio: 'inherit',
});
