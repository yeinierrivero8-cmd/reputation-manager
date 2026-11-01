#!/usr/bin/env node
/**
 * FASE 2: Verify PostgreSQL Migration
 *
 * TEMPLATE - DO NOT EXECUTE YET
 * This script will be used in Phase 2 to verify data integrity after migration
 *
 * Prerequisites:
 * - PostgreSQL with migrated data
 * - knexfile.js configured
 */

import knex from 'knex';
import knexfile from '../knexfile.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, '../data/db.json');

async function verifyMigration() {
  let db;

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  FASE 2: VERIFICACIÓN DE MIGRACIÓN POSTGRESQL             ║');
    console.log('║  Comparando: JSON vs PostgreSQL                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Read source JSON
    const sourceContent = await fs.readFile(DB_FILE, 'utf8');
    const sourceData = JSON.parse(sourceContent);

    // Connect to PostgreSQL
    db = knex(knexfile.development);

    // Step 1: Compare counts
    console.log('📊 Step 1: Comparing record counts...\n');
    const pgUsers = await db('users').count('* as count').first();
    const pgBusinesses = await db('businesses').count('* as count').first();
    const pgReviews = await db('reviews').count('* as count').first();

    const userCount = parseInt(pgUsers.count);
    const businessCount = parseInt(pgBusinesses.count);
    const reviewCount = parseInt(pgReviews.count);

    console.log('┌─ USERS ─────────────────────┐');
    console.log(`│ JSON:       ${String(sourceData.users.length).padEnd(19)} │`);
    console.log(`│ PostgreSQL: ${String(userCount).padEnd(19)} │`);
    const usersMatch = sourceData.users.length === userCount ? '✓' : '❌';
    console.log(`│ Status:     ${usersMatch.padEnd(19)} │`);
    console.log('└─────────────────────────────┘\n');

    console.log('┌─ BUSINESSES ────────────────┐');
    console.log(`│ JSON:       ${String(sourceData.businesses.length).padEnd(19)} │`);
    console.log(`│ PostgreSQL: ${String(businessCount).padEnd(19)} │`);
    const businessesMatch = sourceData.businesses.length === businessCount ? '✓' : '❌';
    console.log(`│ Status:     ${businessesMatch.padEnd(19)} │`);
    console.log('└─────────────────────────────┘\n');

    console.log('┌─ REVIEWS ───────────────────┐');
    console.log(`│ JSON:       ${String(sourceData.reviews.length).padEnd(19)} │`);
    console.log(`│ PostgreSQL: ${String(reviewCount).padEnd(19)} │`);
    const reviewsMatch = sourceData.reviews.length === reviewCount ? '✓' : '❌';
    console.log(`│ Status:     ${reviewsMatch.padEnd(19)} │`);
    console.log('└─────────────────────────────┘\n');

    // Step 2: Spot check first 3 users
    console.log('🔍 Step 2: Spot checking first 3 users...\n');
    for (let i = 0; i < Math.min(3, sourceData.users.length); i++) {
      const sourceUser = sourceData.users[i];
      const pgUser = await db('users').where('id', sourceUser.id).first();
      const emailMatch = pgUser && pgUser.email === sourceUser.email ? '✓' : '❌';
      console.log(`  User ${i + 1}: ${sourceUser.email} - ${emailMatch}`);
    }
    console.log();

    // Step 3: Check for orphaned records
    console.log('🔗 Step 3: Checking referential integrity...\n');
    const orphanedBusinesses = await db.raw(`
      SELECT COUNT(*) as count FROM businesses
      WHERE user_id NOT IN (SELECT id FROM users)
    `);
    const orphanedReviews = await db.raw(`
      SELECT COUNT(*) as count FROM reviews
      WHERE business_id NOT IN (SELECT id FROM businesses)
    `);

    const bizOrphans = parseInt(orphanedBusinesses.rows[0].count);
    const revOrphans = parseInt(orphanedReviews.rows[0].count);

    console.log(`  Orphaned businesses: ${bizOrphans === 0 ? '✓ None' : `❌ ${bizOrphans} found`}`);
    console.log(`  Orphaned reviews: ${revOrphans === 0 ? '✓ None' : `❌ ${revOrphans} found`}`);
    console.log();

    // Final verdict
    console.log('╔════════════════════════════════════════════════════════════╗');
    const allGood = usersMatch === '✓' && businessesMatch === '✓' && reviewsMatch === '✓' &&
                    bizOrphans === 0 && revOrphans === 0;
    if (allGood) {
      console.log('║  ✅ VERIFICACIÓN EXITOSA - DATOS CONSISTENTES            ║');
    } else {
      console.log('║  ❌ VERIFICACIÓN FALLIDA - REVISAR ERRORES               ║');
    }
    console.log('╚════════════════════════════════════════════════════════════╝');

    process.exit(allGood ? 0 : 1);
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    if (db) await db.destroy();
  }
}

verifyMigration();
