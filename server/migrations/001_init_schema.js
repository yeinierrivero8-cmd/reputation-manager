/**
 * Migration: Initialize Database Schema
 *
 * Crea las tablas base para ReputationManager:
 * - users: Usuarios del sistema
 * - businesses: Negocios gestionados por usuarios
 * - reviews: Reseñas de los negocios
 *
 * IMPORTANTE: Esta migración NO se ejecutará hasta FASE 3 (Migración de datos)
 *
 * Foreign Keys:
 * - businesses.user_id → users.id (ON DELETE CASCADE)
 * - reviews.business_id → businesses.id (ON DELETE CASCADE)
 */

export async function up(knex) {
  console.log('⬆️  Migration 001: Creating base schema...');

  // ============================================================
  // TABLE: users
  // ============================================================
  await knex.schema.createTable('users', (table) => {
    table.text('id').primary();
    table.comment('Unique identifier (nanoid format)');

    table.string('name').notNullable();
    table.comment('User full name');

    table.string('email').notNullable().unique();
    table.comment('User email - unique constraint');

    table.string('passwordHash').notNullable();
    table.comment('Bcryptjs hashed password');

    table.timestamp('createdAt', { useTz: false }).defaultTo(knex.fn.now()).notNullable();
    table.comment('Account creation timestamp (UTC)');

    // Index on email for faster lookups
    table.index('email', 'idx_users_email');
  });

  console.log('  ✓ Created table: users');

  // ============================================================
  // TABLE: businesses
  // ============================================================
  await knex.schema.createTable('businesses', (table) => {
    table.text('id').primary();
    table.comment('Unique identifier (nanoid format)');

    table.text('userId').notNullable();
    table.comment('Foreign key - references users.id');

    table.string('name').notNullable();
    table.comment('Business name');

    table.string('type').notNullable();
    table.comment('Business type (e.g., Restaurante, Taller, etc.)');

    table.text('description').notNullable();
    table.comment('Business description');

    table.string('shareLink').notNullable().unique();
    table.comment('Public share link - unique constraint');

    table.timestamp('createdAt', { useTz: false }).defaultTo(knex.fn.now()).notNullable();
    table.comment('Business creation timestamp (UTC)');

    // Foreign key constraint
    table.foreign('userId').references('users.id').onDelete('CASCADE');
    table.comment('CASCADE delete: removing user also removes their businesses');

    // Indexes for common queries
    table.index('userId', 'idx_businesses_user_id');
    table.index('shareLink', 'idx_businesses_share_link');
  });

  console.log('  ✓ Created table: businesses');

  // ============================================================
  // TABLE: reviews
  // ============================================================
  await knex.schema.createTable('reviews', (table) => {
    table.text('id').primary();
    table.comment('Unique identifier (nanoid format)');

    table.text('businessId').notNullable();
    table.comment('Foreign key - references businesses.id');

    table.string('author').notNullable();
    table.comment('Review author name');

    table.specificType('rating', 'integer CHECK (rating >= 1 AND rating <= 5)').notNullable();
    table.comment('Rating 1-5 with CHECK constraint');

    table.text('text').notNullable();
    table.comment('Review text content');

    table.string('platform').notNullable().defaultTo('ReputationManager');
    table.comment('Platform source (ReputationManager, Google, etc.)');

    table.timestamp('createdAt', { useTz: false }).defaultTo(knex.fn.now()).notNullable();
    table.comment('Review creation timestamp (UTC)');

    // Foreign key constraint
    table.foreign('businessId').references('businesses.id').onDelete('CASCADE');
    table.comment('CASCADE delete: removing business also removes its reviews');

    // Indexes for common queries
    table.index('businessId', 'idx_reviews_business_id');
    table.index(['createdAt'], 'idx_reviews_created_at_desc');
  });

  console.log('  ✓ Created table: reviews');
  console.log('✅ Migration 001 completed: Base schema created');
}

export async function down(knex) {
  console.log('⬇️  Migration 001: Dropping base schema...');

  // Drop tables in reverse order (respecting foreign keys)
  await knex.schema.dropTableIfExists('reviews');
  console.log('  ✓ Dropped table: reviews');

  await knex.schema.dropTableIfExists('businesses');
  console.log('  ✓ Dropped table: businesses');

  await knex.schema.dropTableIfExists('users');
  console.log('  ✓ Dropped table: users');

  console.log('✅ Migration 001 reverted: Schema dropped');
}
