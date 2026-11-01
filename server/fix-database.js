import pg from 'pg';

const { Client } = pg;

async function fixDatabase() {
  console.log('🔧 RECONCILIACIÓN DE BD - CREANDO support_tickets EN PORT 5433\n');

  // Use credentials from .env or hardcoded defaults
  const config = {
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'Lastunas1',
    database: 'reputation_manager_dev'
  };

  const client = new Client(config);

  try {
    await client.connect();
    console.log('✓ Conectado a PostgreSQL (puerto 5433)');

    // Check if table already exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'support_tickets'
      )
    `);

    if (!tableExists.rows[0].exists) {
      console.log('\n📊 Creando tabla support_tickets...');

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
      console.log('✓ Tabla created exitosamente');

      // Create indexes
      console.log('📊 Creando índices...');
      await client.query('CREATE INDEX idx_support_ticket_id ON support_tickets(ticket_id)');
      await client.query('CREATE INDEX idx_support_email ON support_tickets(email)');
      await client.query('CREATE INDEX idx_support_status ON support_tickets(status)');
      await client.query('CREATE INDEX idx_support_created ON support_tickets(created_at)');
      console.log('✓ Índices created');
    } else {
      console.log('\n✓ Tabla support_tickets ya existe en puerto 5433');
    }

    // Verify with a test insert/delete
    console.log('\n🧪 Probando inserción...');
    const testId = `test-${Date.now()}`;
    await client.query(
      `INSERT INTO support_tickets (id, ticket_id, name, email, subject, message, status, email_sent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        testId,
        'TEST-' + Math.random().toString(36).substring(7),
        'Test User',
        'test@example.com',
        'Test Subject',
        'This is a test message',
        'new',
        false,
        new Date()
      ]
    );
    console.log('✓ Inserción exitosa');

    // Delete test record
    await client.query('DELETE FROM support_tickets WHERE id = $1', [testId]);
    console.log('✓ Registro de prueba eliminado');

    console.log('\n✅ BD RECONCILIADA CORRECTAMENTE\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixDatabase();
