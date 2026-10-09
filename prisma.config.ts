import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig as definePostgresConfig } from '@prisma/orm-postgres/config';

const contractEmitDatabaseUrl =
  'postgresql://contract_emit:contract_emit@127.0.0.1:1/contract_emit';
const databaseUrl =
  process.env.DATABASE_URL ??
  (process.env.PRISMA_CONTRACT_EMIT === '1' ? contractEmitDatabaseUrl : undefined);

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for Prisma commands.');
}

export default definePrismaConfig({
  orm: definePostgresConfig({
    contract: './src/prisma/contract.prisma',
    db: {
      connection: databaseUrl,
    },
  }),
});
