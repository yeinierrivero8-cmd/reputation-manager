/**
 * Migration: Add Performance Indexes
 *
 * Agrega índices adicionales para optimizar queries frecuentes:
 * - Búsqueda de negocios por usuario
 * - Búsqueda de reseñas por negocio y fecha
 * - Búsqueda de usuarios por email
 *
 * IMPORTANTE: Esta migración NO se ejecutará hasta FASE 3 (Migración de datos)
 */

export async function up(knex) {
  console.log('⬆️  Migration 002: Adding performance indexes...');

  // Índice compuesto para búsqueda eficiente de negocios de un usuario
  // Usado en: dashboard, listar negocios del usuario
  await knex.schema.table('businesses', (table) => {
    table.index(['userId', 'createdAt'], 'idx_businesses_user_created');
  });
  console.log('  ✓ Added index: businesses(user_id, createdAt)');

  // Índice compuesto para búsqueda de reseñas ordenadas por fecha
  // Usado en: listar reseñas, widget, estadísticas
  await knex.schema.table('reviews', (table) => {
    table.index(['businessId', 'createdAt'], 'idx_reviews_business_created');
  });
  console.log('  ✓ Added index: reviews(business_id, createdAt)');

  // Índice para búsqueda por rating
  // Usado en: filtrado por rating, estadísticas
  await knex.schema.table('reviews', (table) => {
    table.index('rating', 'idx_reviews_rating');
  });
  console.log('  ✓ Added index: reviews(rating)');

  // Índice para búsqueda por platform
  // Usado en: filtrado por plataforma
  await knex.schema.table('reviews', (table) => {
    table.index('platform', 'idx_reviews_platform');
  });
  console.log('  ✓ Added index: reviews(platform)');

  console.log('✅ Migration 002 completed: Performance indexes added');
}

export async function down(knex) {
  console.log('⬇️  Migration 002: Removing performance indexes...');

  // Remove composite indexes
  await knex.schema.table('businesses', (table) => {
    table.dropIndex([], 'idx_businesses_user_created');
  });
  console.log('  ✓ Removed index: businesses(user_id, createdAt)');

  await knex.schema.table('reviews', (table) => {
    table.dropIndex([], 'idx_reviews_business_created');
  });
  console.log('  ✓ Removed index: reviews(business_id, createdAt)');

  // Remove single column indexes
  await knex.schema.table('reviews', (table) => {
    table.dropIndex([], 'idx_reviews_rating');
  });
  console.log('  ✓ Removed index: reviews(rating)');

  await knex.schema.table('reviews', (table) => {
    table.dropIndex([], 'idx_reviews_platform');
  });
  console.log('  ✓ Removed index: reviews(platform)');

  console.log('✅ Migration 002 reverted: Performance indexes removed');
}
