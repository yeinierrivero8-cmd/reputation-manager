/**
 * Migration: Create Onboarding Progress Table
 *
 * Crea la tabla para rastrear el progreso de la guía de usuario (5 pasos).
 * No destructiva - solo añade nueva funcionalidad.
 *
 * Campos:
 * - id: Identificador único (nanoid)
 * - userId: Foreign key a users.id (CASCADE delete)
 * - step_1_configure_business: Paso 1 completado
 * - step_2_get_link: Paso 2 completado
 * - step_3_authentic_reviews: Paso 3 completado
 * - step_4_widget_install: Paso 4 completado
 * - step_5_verify_functionality: Paso 5 completado
 * - createdAt: Timestamp de creación
 * - updatedAt: Timestamp de última actualización
 */

export async function up(knex) {
  console.log('⬆️  Migration 004: Creating onboarding_progress table...');

  await knex.schema.createTable('onboarding_progress', (table) => {
    table.text('id').primary();
    table.comment('Unique identifier (nanoid format)');

    table.text('userId').notNullable().unique();
    table.comment('Foreign key - references users.id (one record per user)');

    table.boolean('step_1_configure_business').defaultTo(false).notNullable();
    table.comment('Step 1: User has configured their first business');

    table.boolean('step_2_get_link').defaultTo(false).notNullable();
    table.comment('Step 2: User has viewed and copied their public link');

    table.boolean('step_3_authentic_reviews').defaultTo(false).notNullable();
    table.comment('Step 3: User has learned about authentic review requests');

    table.boolean('step_4_widget_install').defaultTo(false).notNullable();
    table.comment('Step 4: User has viewed widget installation code');

    table.boolean('step_5_verify_functionality').defaultTo(false).notNullable();
    table.comment('Step 5: User has verified their setup (manual step)');

    table.timestamp('createdAt', { useTz: false }).defaultTo(knex.fn.now()).notNullable();
    table.comment('Progress record creation timestamp (UTC)');

    table.timestamp('updatedAt', { useTz: false }).defaultTo(knex.fn.now()).notNullable();
    table.comment('Progress record last update timestamp (UTC)');

    // Foreign key constraint
    table.foreign('userId').references('users.id').onDelete('CASCADE');
    table.comment('CASCADE delete: removing user also removes their progress');

    // Index for user lookups
    table.index('userId', 'idx_onboarding_user_id');
  });

  console.log('  ✓ Created table: onboarding_progress');
  console.log('✅ Migration 004 completed: Onboarding progress table created');
}

export async function down(knex) {
  console.log('⬇️  Migration 004: Dropping onboarding_progress table...');

  await knex.schema.dropTableIfExists('onboarding_progress');
  console.log('  ✓ Dropped table: onboarding_progress');

  console.log('✅ Migration 004 reverted: Onboarding progress table dropped');
}
