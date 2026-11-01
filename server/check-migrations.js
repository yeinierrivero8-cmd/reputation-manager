import pg from 'pg';

const { Client } = pg;

async function checkMigrations() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'reputation_manager_dev'
  });

  try {
    await client.connect();

    // Check if knex migrations table exists
    const migrationTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'knex_migrations'
      )
    `);

    if (migrationTableCheck.rows[0].exists) {
      const migrations = await client.query('SELECT * FROM knex_migrations');
      console.log('Migraciones registradas en Knex:');
      migrations.rows.forEach(m => {
        console.log(`  - ${m.name} (batch: ${m.batch})`);
      });
    } else {
      console.log('No hay tabla de migraciones de Knex');
    }

    // Check if support_tickets table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'support_tickets'
      )
    `);

    if (tableCheck.rows[0].exists) {
      console.log('\n✓ Tabla support_tickets existe');

      const columns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'support_tickets'
        ORDER BY ordinal_position
      `);

      console.log('Columnas:');
      columns.rows.forEach(c => {
        console.log(`  - ${c.column_name}: ${c.data_type}`);
      });
    } else {
      console.log('\n❌ Tabla support_tickets NO existe');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkMigrations();
