/**
 * Migration 008: Add Webhook Events Table
 *
 * Crea tabla para deduplicación de webhooks de Stripe.
 * Evita procesar dos veces el mismo evento (idempotencia).
 *
 * Problema que resuelve:
 * - Stripe puede reenviar webhooks si falla la respuesta
 * - Sin tracking, se crean suscripciones duplicadas
 * - Con stripeEventId único, se previenen duplicados
 */

export async function up(knex) {
  console.log('⬆️  Migration 008: Creating webhook_events table...');

  await knex.schema.createTable('webhook_events', (table) => {
    table.text('id').primary();
    table.comment('Unique identifier (nanoid format)');

    table.text('stripeEventId').notNullable().unique();
    table.comment('Stripe event ID (evt_...) - UNIQUE to prevent duplicates');

    table.enum('eventType', [
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'charge.refunded'
    ]).notNullable();
    table.comment('Type of webhook event');

    table.enum('status', ['processed', 'failed', 'ignored']).notNullable().defaultTo('processed');
    table.comment('Processing status: processed (success), failed (error), ignored (skip)');

    table.text('userId').nullable();
    table.comment('User ID affected by this event (if applicable)');

    table.text('details').nullable();
    table.comment('JSON details of the event for debugging');

    table.text('errorMessage').nullable();
    table.comment('Error message if processing failed');

    table.timestamp('processedAt', { useTz: false }).defaultTo(knex.fn.now()).notNullable();
    table.comment('When webhook was processed');

    table.timestamp('createdAt', { useTz: false }).defaultTo(knex.fn.now()).notNullable();
    table.comment('When webhook was received from Stripe');

    // Indexes for efficient lookups
    table.index('stripeEventId', 'idx_webhook_stripe_event_id');
    table.index('eventType', 'idx_webhook_event_type');
    table.index('status', 'idx_webhook_status');
    table.index('userId', 'idx_webhook_user_id');
    table.index(['processedAt'], 'idx_webhook_processed_at');
  });

  console.log('  ✓ Created table: webhook_events');
  console.log('✅ Migration 008 completed: Webhook events table created');
}

export async function down(knex) {
  console.log('⬇️  Migration 008: Dropping webhook_events table...');

  await knex.schema.dropTableIfExists('webhook_events');
  console.log('  ✓ Dropped table: webhook_events');

  console.log('✅ Migration 008 reverted: Webhook events table dropped');
}
