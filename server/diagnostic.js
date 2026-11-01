import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

async function runDiagnostic() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DEL SISTEMA DE SOPORTE\n');
  console.log('=' .repeat(60));

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'reputation_manager_dev'
  });

  try {
    await client.connect();
    console.log('\n✓ Conectado a PostgreSQL');

    // 1. VERIFICAR SI support_tickets EXISTE
    console.log('\n📋 1. VERIFICANDO TABLA support_tickets:');
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'support_tickets'
      )
    `);

    if (tableExists.rows[0].exists) {
      console.log('   ✓ Tabla support_tickets EXISTE');

      // Verificar estructura
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'support_tickets'
        ORDER BY ordinal_position
      `);

      console.log('\n   Estructura de la tabla:');
      columns.rows.forEach((col, idx) => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`     ${idx + 1}. ${col.column_name}: ${col.data_type} ${nullable}${def}`);
      });

      // Verificar índices
      const indexes = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'support_tickets'
      `);

      console.log('\n   Índices:');
      if (indexes.rows.length > 0) {
        indexes.rows.forEach(idx => {
          console.log(`     - ${idx.indexname}`);
        });
      } else {
        console.log('     (ninguno)');
      }

      // Contar registros
      const count = await client.query('SELECT COUNT(*) as count FROM support_tickets');
      console.log(`\n   Registros: ${count.rows[0].count}`);
    } else {
      console.log('   ❌ Tabla support_tickets NO EXISTE');
    }

    // 2. VERIFICAR MIGRACIONES EN KNEX
    console.log('\n📊 2. VERIFICANDO MIGRACIONES EN KNEX:');
    const migrationTableExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'knex_migrations'
      )
    `);

    if (migrationTableExists.rows[0].exists) {
      console.log('   ✓ Tabla knex_migrations EXISTE');

      const migrations = await client.query(`
        SELECT name, batch
        FROM knex_migrations
        ORDER BY batch, name
      `);

      console.log('\n   Migraciones ejecutadas:');
      migrations.rows.forEach(m => {
        console.log(`     - Batch ${m.batch}: ${m.name}`);
      });

      // Verificar si 003 está registrada
      const migration003 = migrations.rows.find(m => m.name.includes('003'));
      if (migration003) {
        console.log('\n   ✓ Migration 003_create_support_tickets registrada como ejecutada');
      } else {
        console.log('\n   ⚠️  Migration 003_create_support_tickets NO está registrada');
      }
    } else {
      console.log('   ℹ️  Tabla knex_migrations NO EXISTE (migraciones nunca se ejecutaron)');
    }

    // 3. VERIFICAR ARCHIVOS DE MIGRACIÓN
    console.log('\n📁 3. VERIFICANDO ARCHIVOS DE MIGRACIÓN:');
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.js'))
      .sort();

    console.log('   Archivos encontrados:');
    migrationFiles.forEach(f => console.log(`     - ${f}`));

    // Verificar contenido de 003
    const migration003Path = path.join(migrationsDir, '003_create_support_tickets.js');
    if (fs.existsSync(migration003Path)) {
      console.log('\n   ✓ Archivo 003_create_support_tickets.js existe');
      const content = fs.readFileSync(migration003Path, 'utf-8');
      if (content.includes("'support_tickets'")) {
        console.log('   ✓ Contiene referencia a tabla support_tickets');
      }
    } else {
      console.log('\n   ❌ Archivo 003_create_support_tickets.js NO EXISTE');
    }

    // 4. VERIFICAR OTRAS TABLAS
    console.log('\n📚 4. VERIFICANDO OTRAS TABLAS:');
    const allTables = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `);

    console.log('   Tablas en la BD:');
    allTables.rows.forEach(t => {
      const special = ['users', 'businesses', 'reviews', 'support_tickets'].includes(t.tablename)
        ? ' ✓' : '';
      console.log(`     - ${t.tablename}${special}`);
    });

    // 5. INTENTAR INSERTAR UN REGISTRO DE PRUEBA
    console.log('\n🧪 5. PRUEBA DE INSERCIÓN:');
    if (tableExists.rows[0].exists) {
      try {
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
        console.log('   ✓ Inserción exitosa');

        // Verificar que se guardó
        const check = await client.query(
          'SELECT * FROM support_tickets WHERE id = $1',
          [testId]
        );

        if (check.rows.length > 0) {
          console.log('   ✓ Registro recuperado correctamente');
          console.log(`     - Ticket ID: ${check.rows[0].ticket_id}`);
          console.log(`     - Nombre: ${check.rows[0].name}`);
          console.log(`     - Status: ${check.rows[0].status}`);

          // Limpiar registro de prueba
          await client.query('DELETE FROM support_tickets WHERE id = $1', [testId]);
          console.log('   ✓ Registro de prueba eliminado');
        }
      } catch (e) {
        console.log(`   ❌ Error en inserción: ${e.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ DIAGNÓSTICO COMPLETADO\n');

  } catch (error) {
    console.error('❌ Error durante diagnóstico:', error.message);
  } finally {
    await client.end();
  }
}

runDiagnostic();
