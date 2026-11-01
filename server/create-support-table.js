import pg from 'pg';

const { Client } = pg;

async function createSupportTable() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'reputation_manager_dev'
  });

  try {
    await client.connect();
    console.log('✓ Conectado a la base de datos');

    // Drop table if exists
    await client.query('DROP TABLE IF EXISTS support_tickets');
    console.log('✓ Tabla anterior eliminada (si existía)');

    // Create table
    const sql = `
      CREATE TABLE support_tickets (
        id TEXT PRIMARY KEY,
        ticket_id VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'new',
        response TEXT,
        email_sent BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        replied_at TIMESTAMP
      );
    `;

    await client.query(sql);
    console.log('✓ Tabla support_tickets creada exitosamente');

    // Create indexes
    await client.query('CREATE INDEX idx_support_ticket_id ON support_tickets(ticket_id)');
    console.log('✓ Índice en ticket_id creado');

    await client.query('CREATE INDEX idx_support_email ON support_tickets(email)');
    console.log('✓ Índice en email creado');

    await client.query('CREATE INDEX idx_support_status ON support_tickets(status)');
    console.log('✓ Índice en status creado');

    await client.query('CREATE INDEX idx_support_created ON support_tickets(created_at)');
    console.log('✓ Índice en created_at creado');

    console.log('\n✅ Tabla de soporte creada exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createSupportTable();
