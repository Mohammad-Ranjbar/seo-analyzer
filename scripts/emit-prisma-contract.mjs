import { spawnSync } from 'node:child_process';

const executable = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
const result = spawnSync(executable, ['contract', 'emit'], {
  env: {
    ...process.env,
    PRISMA_CONTRACT_EMIT: '1',
  },
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
