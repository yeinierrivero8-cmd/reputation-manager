import 'dotenv/config';
import knex from 'knex';

const config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5433,
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

async function runMigrations() {
  const db = knex(config);

  try {
    console.log('🚀 Iniciando migraciones...');
    console.log(`📍 Base de datos: ${config.connection.database}`);
    console.log(`🖥️  Host: ${config.connection.host}:${config.connection.port}\n`);

    await db.migrate.latest();

    console.log('\n✅ Migraciones completadas exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error en migraciones:', error.message);
    process.exit(1);
  }
}

runMigrations();
