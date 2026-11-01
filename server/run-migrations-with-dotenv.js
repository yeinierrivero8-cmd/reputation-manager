import dotenv from 'dotenv';
import knex from 'knex';

dotenv.config();

const config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'reputation_manager_dev'
  },
  migrations: {
    directory: './migrations',
    extension: 'js',
    loadExtensions: ['.js']
  }
};

console.log('Connecting to:', {
  host: config.connection.host,
  port: config.connection.port,
  user: config.connection.user,
  database: config.connection.database
});

const db = knex(config);

async function runMigrations() {
  try {
    console.log('Running migrations...');
    const result = await db.migrate.latest();
    console.log('✓ Migrations completed:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigrations();
