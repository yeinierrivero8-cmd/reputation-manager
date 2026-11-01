/**
 * Migration 006: Add Subscriptions Tables
 *
 * Crea las tablas para gestionar suscripciones de Stripe:
 * - subscriptions: Estado actual de la suscripción
 * - subscription_history: Audit trail de cambios
 *
 * Relaciones:
 * - subscriptions.user_id → users.id (FK ON DELETE CASCADE)
 */

export async function up(knex) {
  console.log('⬆️  Migration 006: Creating subscription tables...');

  // ============================================================
  // TABLE: subscriptions
  // ============================================================
  await knex.schema.createTable('subscriptions', (table) => {
    table.text('id').primary();
    table.comment('Unique identifier (nanoid format)');

    table.text('userId').notNullable();
    table.comment('Foreign key - references users.id');

    table.enum('plan', ['starter', 'professional', 'business']).notNullable().defaultTo('starter');
    table.comment('Current plan level');

    table.enum('status', ['active', 'canceled', 'past_due', 'unpaid', 'incomplete']).notNullable().defaultTo('active');
    table.comment('Subscription status from Stripe');

    table.enum('billingPeriod', ['monthly', 'yearly']).notNullable().defaultTo('monthly');
    table.comment('Billing cycle: monthly or yearly');

    table.text('stripeCustomerId').nullable();
    table.comment('Stripe customer ID (cus_...)');

    table.text('stripeSubscriptionId').nullable();
    table.comment('Stripe subscription ID (sub_...)');

    table.text('stripePriceId').nullable();
    table.comment('Stripe price ID (price_...)');

    table.integer('businessLimit').notNullable().defaultTo(1);
    table.comment('Max businesses for this plan (1, 3, or 10)');

    table.decimal('amount', 10, 2).nullable();
    table.comment('Price in cents (19.00, 39.00, 79.00, etc)');

    table.string('currency', 3).notNullable().defaultTo('usd');
    table.comment('Currency code (usd, etc)');

    table.timestamp('currentPeriodStart', { useTz: false }).notNullable();
    table.comment('Current billing period start date (UTC)');

    table.timestamp('currentPeriodEnd', { useTz: false }).notNullable();
    table.comment('Current billing period end date (UTC)');

    table.timestamp('canceledAt', { useTz: false }).nullable();
    table.comment('When subscription was canceled (NULL if active)');

    table.timestamp('createdAt', { useTz: false }).defaultTo(knex.fn.now()).notNullable();
    table.comment('Subscription creation timestamp (UTC)');

    table.timestamp('updatedAt', { useTz: false }).defaultTo(knex.fn.now()).notNullable();
    table.comment('Last update timestamp (UTC)');

    // Foreign key constraint
    table.foreign('userId').references('users.id').onDelete('CASCADE');
    table.comment('CASCADE delete: removing user also removes subscriptions');

    // Indexes
    table.unique('userId', 'uq_subscriptions_user_id');
    table.comment('One subscription per user');

    table.index('plan', 'idx_subscriptions_plan');
    table.index('status', 'idx_subscriptions_status');
    table.index('stripeSubscriptionId', 'idx_subscriptions_stripe_sub_id');
    table.index('currentPeriodEnd', 'idx_subscriptions_period_end');
  });

  console.log('  ✓ Created table: subscriptions');

  // ============================================================
  // TABLE: subscription_history
  // ============================================================
  await knex.schema.createTable('subscription_history', (table) => {
    table.text('id').primary();
    table.comment('Unique identifier (nanoid format)');

    table.text('userId').notNullable();
    table.comment('Foreign key - references users.id');

    table.text('subscriptionId').notNullable();
    table.comment('Foreign key - references subscriptions.id');

    table.enum('eventType', [
      'created',
      'updated',
      'plan_changed',
      'canceled',
      'reactivated',
      'payment_failed',
      'payment_succeeded'
    ]).notNullable();
    table.comment('Type of event that occurred');

    table.enum('previousPlan', ['starter', 'professional', 'business']).nullable();
    table.comment('Previous plan (for plan_changed events)');

    table.enum('newPlan', ['starter', 'professional', 'business']).nullable();
    table.comment('New plan (for plan_changed events)');

    table.text('details').nullable();
    table.comment('JSON details of the change');

    table.text('stripeEventId').nullable();
    table.comment('Stripe event ID that triggered this (evt_...)');

    table.timestamp('createdAt', { useTz: false }).defaultTo(knex.fn.now()).notNullable();
    table.comment('Event timestamp (UTC)');

    // Foreign keys
    table.foreign('userId').references('users.id').onDelete('CASCADE');
    table.comment('CASCADE delete: removing user also removes history');

    table.foreign('subscriptionId').references('subscriptions.id').onDelete('CASCADE');
    table.comment('CASCADE delete: removing subscription also removes history');

    // Indexes
    table.index('userId', 'idx_sub_history_user_id');
    table.index('subscriptionId', 'idx_sub_history_subscription_id');
    table.index('eventType', 'idx_sub_history_event_type');
    table.index('stripeEventId', 'idx_sub_history_stripe_event_id');
    table.index(['createdAt'], 'idx_sub_history_created_at_desc');
  });

  console.log('  ✓ Created table: subscription_history');

  console.log('✅ Migration 006 completed: Subscription tables created');
}

export async function down(knex) {
  console.log('⬇️  Migration 006: Dropping subscription tables...');

  // Drop tables in reverse order (respecting foreign keys)
  await knex.schema.dropTableIfExists('subscription_history');
  console.log('  ✓ Dropped table: subscription_history');

  await knex.schema.dropTableIfExists('subscriptions');
  console.log('  ✓ Dropped table: subscriptions');

  console.log('✅ Migration 006 reverted: Subscription tables dropped');
}
