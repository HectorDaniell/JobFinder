import { defineConfig } from 'drizzle-kit';

module.exports = defineConfig({
  driver: 'pg',
  dialect: 'postgresql',
  schema: './packages/db/src/schema.ts',
  out: './packages/db/migrations',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://jobfinder:localdev@localhost:5433/jobfinder',
  },
  verbose: true,
  strict: true,
});
