#!/usr/bin/env node

/**
 * Run Migrations Script
 *
 * Ejecuta las migraciones pendientes sin depender del CLI de Knex
 * Soluciona problemas de autenticación leyendo .env directamente
 */

import 'dotenv/config';
import knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsPath = path.join(__dirname, '../migrations');

console.log('\n🚀 EJECUTANDO MIGRACIONES\n');
console.log('═══════════════════════════════════════════════════════════════\n');

// Configuración de conexión
const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'reputation_manager_dev'
  },
  migrations: {
    directory: migrationsPath,
    extension: 'js',
    loadExtensions: ['.js']
  }
});

async function runMigrations() {
  try {
    console.log('🔍 Verificando conexión a PostgreSQL...\n');

    // Test connection
    const result = await db.raw('SELECT now()');
    console.log(`✓ Conectado a PostgreSQL`);
    console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`  Puerto: ${process.env.DB_PORT || '5433'}`);
    console.log(`  Base de datos: ${process.env.DB_NAME || 'reputation_manager_dev'}\n`);

    // Ejecutar migraciones
    console.log('📝 Ejecutando migraciones pendientes...\n');
    const [batchNo, logEntries] = await db.migrate.latest();

    if (logEntries.length === 0) {
      console.log('ℹ️  No hay migraciones pendientes.\n');
    } else {
      console.log(`✅ Ejecutadas ${logEntries.length} migración(es):\n`);
      logEntries.forEach(entry => {
        console.log(`  ✓ ${entry}`);
      });
      console.log();
    }

    // Verificar tablas creadas
    console.log('📊 TABLAS EN BASE DE DATOS\n');
    const tables = await db.raw(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('Tablas actuales:');
    tables.rows.forEach(row => {
      console.log(`  • ${row.table_name}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════\n');
    console.log('✅ MIGRACIONES COMPLETADAS\n');

    // Verificar estructura de nuevas tablas
    const hasSubscriptions = tables.rows.some(t => t.table_name === 'subscriptions');
    const hasHistory = tables.rows.some(t => t.table_name === 'subscription_history');

    if (hasSubscriptions && hasHistory) {
      console.log('🎉 Nuevas tablas creadas:');
      console.log('  ✓ subscriptions');
      console.log('  ✓ subscription_history');
      console.log();

      // Mostrar estructura de subscriptions
      const subColumns = await db.raw(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'subscriptions'
        ORDER BY ordinal_position;
      `);

      console.log('Columnas en tabla "subscriptions":');
      subColumns.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
        console.log(`  • ${col.column_name}: ${col.data_type} ${nullable}`);
      });
    }

    console.log();

  } catch (error) {
    console.error('❌ ERROR EN MIGRACIONES\n');
    console.error(`Tipo: ${error.code || error.name}`);
    console.error(`Mensaje: ${error.message}\n`);

    if (error.message.includes('password')) {
      console.error('Posible causa: Credenciales incorrectas en .env');
      console.error('Verifica:');
      console.error('  - DB_USER');
      console.error('  - DB_PASSWORD');
      console.error('  - DB_HOST');
      console.error('  - DB_PORT\n');
    }

    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runMigrations();
