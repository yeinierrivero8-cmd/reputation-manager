import pg from 'pg';

const { Client } = pg;

async function migrateOnboarding() {
  console.log('🔧 MIGRACIÓN NO DESTRUCTIVA - ONBOARDING PROGRESS\n');

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
        WHERE table_name = 'onboarding_progress'
      )
    `);

    if (!tableExists.rows[0].exists) {
      console.log('\n📊 Creando tabla onboarding_progress...');

      const sql = `
        CREATE TABLE onboarding_progress (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          step_1_configure_business BOOLEAN DEFAULT FALSE NOT NULL,
          step_2_get_link BOOLEAN DEFAULT FALSE NOT NULL,
          step_3_authentic_reviews BOOLEAN DEFAULT FALSE NOT NULL,
          step_4_widget_install BOOLEAN DEFAULT FALSE NOT NULL,
          step_5_verify_functionality BOOLEAN DEFAULT FALSE NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
      `;

      await client.query(sql);
      console.log('✓ Tabla creada exitosamente');

      // Create index
      console.log('📊 Creando índice...');
      await client.query('CREATE INDEX idx_onboarding_user_id ON onboarding_progress("userId")');
      console.log('✓ Índice creado');

      // Initialize progress records for existing users
      console.log('\n📊 Inicializando registros de progreso para usuarios existentes...');
      const result = await client.query(`
        INSERT INTO onboarding_progress (id, "userId", "createdAt", "updatedAt")
        SELECT 'op_' || gen_random_uuid(), id, NOW(), NOW()
        FROM users
        WHERE id NOT IN (SELECT "userId" FROM onboarding_progress)
        ON CONFLICT DO NOTHING
      `);
      console.log(`✓ ${result.rowCount || 0} registros de progreso inicializados`);
    } else {
      console.log('\n✓ Tabla onboarding_progress ya existe');
    }

    // Verify the schema
    console.log('\n🧪 Verificando estructura...');
    const schema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'onboarding_progress'
      ORDER BY ordinal_position
    `);

    console.log('Columnas de onboarding_progress:');
    schema.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Count users with progress
    const progressCount = await client.query('SELECT COUNT(*) as count FROM onboarding_progress');
    console.log(`\n✓ Registros de progreso: ${progressCount.rows[0].count}`);

    console.log('\n✅ MIGRACIÓN COMPLETADA CORRECTAMENTE\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateOnboarding();
