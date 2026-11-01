import pg from 'pg';

const { Client } = pg;

async function initDB() {
  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres' // Connect to default postgres DB
  });

  try {
    await adminClient.connect();
    console.log('✓ Connected to PostgreSQL server');

    const dbName = process.env.DB_NAME || 'reputation_manager_dev';

    // Check if database exists
    const result = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (result.rows.length === 0) {
      console.log(`Creating database: ${dbName}`);
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✓ Database created: ${dbName}`);
    } else {
      console.log(`✓ Database already exists: ${dbName}`);
    }

    await adminClient.end();
    console.log('✅ Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

initDB();
