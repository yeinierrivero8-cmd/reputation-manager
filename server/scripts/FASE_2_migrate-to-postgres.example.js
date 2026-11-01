#!/usr/bin/env node
/**
 * FASE 2: Migrate JSON data to PostgreSQL
 *
 * TEMPLATE - DO NOT EXECUTE YET
 * This script will be used in Phase 2 after PostgreSQL is configured
 *
 * Prerequisites:
 * - PostgreSQL installed and running
 * - knexfile.js configured
 * - Schema migrations executed
 * - Node dependencies installed: knex, pg
 */

import knex from 'knex';
import knexfile from '../knexfile.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, '../data/db.json');

async function migrateData() {
  let db;

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  FASE 2: MIGRACIÓN DE JSON A POSTGRESQL                   ║');
    console.log('║  Fuente: server/data/db.json                              ║');
    console.log('║  Destino: PostgreSQL (reputation_manager_dev)             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Initialize Knex connection
    db = knex(knexfile.development);

    // Step 1: Read source data
    console.log('📖 Step 1: Reading source JSON...');
    const content = await fs.readFile(DB_FILE, 'utf8');
    const sourceData = JSON.parse(content);
    console.log(`  ✓ Usuarios: ${sourceData.users.length}`);
    console.log(`  ✓ Negocios: ${sourceData.businesses.length}`);
    console.log(`  ✓ Reseñas: ${sourceData.reviews.length}\n`);

    // Step 2: Disable constraints temporarily
    console.log('🔓 Step 2: Disabling constraints...');
    await db.raw('ALTER TABLE reviews DISABLE TRIGGER ALL');
    await db.raw('ALTER TABLE businesses DISABLE TRIGGER ALL');
    await db.raw('ALTER TABLE users DISABLE TRIGGER ALL');
    console.log('  ✓ Constraints disabled\n');

    // Step 3: Import users
    console.log('👥 Step 3: Importing users...');
    await db('users').insert(sourceData.users);
    console.log(`  ✓ ${sourceData.users.length} users imported\n`);

    // Step 4: Import businesses
    console.log('🏢 Step 4: Importing businesses...');
    await db('businesses').insert(sourceData.businesses);
    console.log(`  ✓ ${sourceData.businesses.length} businesses imported\n`);

    // Step 5: Import reviews
    console.log('⭐ Step 5: Importing reviews...');
    await db('reviews').insert(sourceData.reviews);
    console.log(`  ✓ ${sourceData.reviews.length} reviews imported\n`);

    // Step 6: Re-enable constraints
    console.log('🔐 Step 6: Re-enabling constraints...');
    await db.raw('ALTER TABLE users ENABLE TRIGGER ALL');
    await db.raw('ALTER TABLE businesses ENABLE TRIGGER ALL');
    await db.raw('ALTER TABLE reviews ENABLE TRIGGER ALL');
    console.log('  ✓ Constraints re-enabled\n');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (db) await db.destroy();
  }
}

migrateData();
