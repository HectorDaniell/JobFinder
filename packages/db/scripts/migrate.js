/**
 * Aplica las migraciones pendientes contra la base de datos.
 *
 * CommonJS a propósito: el monorepo se unificó a CommonJS (Sprint 4) y este
 * archivo usaba `import` sin declarar el tipo de módulo, así que Node lo
 * reinterpretaba como ESM — donde `__dirname` no existe y la ruta a las
 * migraciones fallaba.
 */
const { config } = require('dotenv');
const { join } = require('path');

// El .env vive en la raíz del monorepo (tres niveles arriba de scripts/).
config({ path: join(__dirname, '../../../.env') });

const { migrate } = require('drizzle-orm/postgres-js/migrator');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://jobfinder:localdev@localhost:5433/jobfinder';

const runMigrations = async () => {
  const client = postgres(databaseUrl, { max: 1 });
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
