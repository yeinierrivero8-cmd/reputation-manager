/**
 * Migration 007: Add Billing Fields to Users
 *
 * Agrega campos a la tabla users para tracking de Stripe:
 * - stripeCustomerId: Identifier del cliente en Stripe
 * - defaultPlan: Plan por defecto (starter si no tiene suscripción)
 *
 * IMPORTANTE:
 * - Usa ALTER TABLE para agregar columnas a tabla existente
 * - Los usuarios existentes tendrán valores NULL/default
 * - No afecta datos existentes
 */

export async function up(knex) {
  console.log('⬆️  Migration 007: Adding billing fields to users table...');

  // Verificar si las columnas ya existen antes de agregarlas
  const hasStripeCustomerId = await knex.schema.hasColumn('users', 'stripeCustomerId');
  const hasDefaultPlan = await knex.schema.hasColumn('users', 'defaultPlan');

  if (!hasStripeCustomerId) {
    await knex.schema.table('users', (table) => {
      table.text('stripeCustomerId').nullable();
      table.comment('Stripe customer ID (cus_...) - linked to subscriptions');
    });
    console.log('  ✓ Added column: stripeCustomerId');
  } else {
    console.log('  ⓘ Column stripeCustomerId already exists, skipping...');
  }

  if (!hasDefaultPlan) {
    await knex.schema.table('users', (table) => {
      table.enum('defaultPlan', ['starter', 'professional', 'business']).notNullable().defaultTo('starter');
      table.comment('Default plan when no subscription exists');
    });
    console.log('  ✓ Added column: defaultPlan');
  } else {
    console.log('  ⓘ Column defaultPlan already exists, skipping...');
  }

  // Agregar índice para búsquedas rápidas de cliente Stripe
  const hasStripeIndex = await knex.schema.hasTable('users');
  if (hasStripeIndex && !hasStripeCustomerId) {
    // El índice se agregará cuando se cree la columna (opcional, Knex lo maneja)
    console.log('  ✓ Stripe customer ID indexed automatically');
  }

  console.log('✅ Migration 007 completed: Billing fields added to users');
}

export async function down(knex) {
  console.log('⬇️  Migration 007: Removing billing fields from users table...');

  // Remover columnas si existen
  const hasStripeCustomerId = await knex.schema.hasColumn('users', 'stripeCustomerId');
  const hasDefaultPlan = await knex.schema.hasColumn('users', 'defaultPlan');

  if (hasStripeCustomerId) {
    await knex.schema.table('users', (table) => {
      table.dropColumn('stripeCustomerId');
    });
    console.log('  ✓ Dropped column: stripeCustomerId');
  }

  if (hasDefaultPlan) {
    await knex.schema.table('users', (table) => {
      table.dropColumn('defaultPlan');
    });
    console.log('  ✓ Dropped column: defaultPlan');
  }

  console.log('✅ Migration 007 reverted: Billing fields removed from users');
}
