import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { join } from 'path';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://jobfinder:localdev@localhost:5433/jobfinder';

const runMigrations = async () => {
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  console.log('⏳ Running migrations...');

  try {
    await migrate(db, {
      migrationsFolder: join(__dirname, '../migrations'),
    });

    console.log('✅ Migrations completed successfully!');
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    await client.end();
    process.exit(1);
  }
};

runMigrations();
