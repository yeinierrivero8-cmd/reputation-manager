import knex from 'knex';
import config from './knexfile.js';

const db = knex(config.development);

async function runMigrations() {
  try {
    console.log('Running migrations...');
    await db.migrate.latest();
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigrations();
