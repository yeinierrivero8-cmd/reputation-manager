/**
 * Migration: Add Admin Features for Support System
 *
 * Agrega:
 * 1. Columna user_id a support_tickets para asociar tickets con usuarios
 * 2. Tabla support_responses para almacenar respuestas del administrador
 * 3. Columna response_status a support_tickets para rastrear estado
 *
 * Esta migración es SEGURA y no elimina datos existentes.
 */

export async function up(knex) {
  console.log('⬆️  Migration 005: Adding admin features...');

  // 1. Add user_id column to support_tickets (if it doesn't exist)
  const hasUserIdColumn = await knex.schema.hasColumn('support_tickets', 'user_id');
  if (!hasUserIdColumn) {
    await knex.schema.table('support_tickets', (table) => {
      table.text('user_id').nullable();
      table.comment('User ID from JWT token (nullable for anonymous submissions)');
      table.foreign('user_id').references('users.id').onDelete('SET NULL');
      table.index('user_id', 'idx_support_user_id');
    });
    console.log('  ✓ Added column: support_tickets.user_id');
  } else {
    console.log('  ℹ️  Column support_tickets.user_id already exists');
  }

  // 2. Add response_status column to support_tickets (if it doesn't exist)
  const hasResponseStatusColumn = await knex.schema.hasColumn('support_tickets', 'response_status');
  if (!hasResponseStatusColumn) {
    await knex.schema.table('support_tickets', (table) => {
      table.enum('response_status', ['pending', 'responded', 'closed']).defaultTo('pending').notNullable();
      table.comment('Response status: pending (no response yet), responded (admin replied), closed (archived)');
    });
    console.log('  ✓ Added column: support_tickets.response_status');
  } else {
    console.log('  ℹ️  Column support_tickets.response_status already exists');
  }

  // 3. Create support_responses table (if it doesn't exist)
  const hasResponsesTable = await knex.schema.hasTable('support_responses');
  if (!hasResponsesTable) {
    await knex.schema.createTable('support_responses', (table) => {
      table.text('id').primary();
      table.comment('Unique identifier (nanoid format)');

      table.string('ticket_id').notNullable();
      table.comment('Reference to support_tickets.ticket_id');
      table.foreign('ticket_id').references('support_tickets.ticket_id').onDelete('CASCADE');
      table.index('ticket_id', 'idx_response_ticket_id');

      table.text('admin_id').notNullable();
      table.comment('Admin user ID who replied');
      table.foreign('admin_id').references('users.id').onDelete('RESTRICT');
      table.index('admin_id', 'idx_response_admin_id');

      table.text('response_text').notNullable();
      table.comment('Response message from admin');

      table.boolean('email_sent').defaultTo(false).notNullable();
      table.comment('Whether response email was sent to customer');

      table.timestamp('created_at', { useTz: false }).defaultTo(knex.fn.now()).notNullable();
      table.comment('Response creation timestamp (UTC)');

      // Indexes for common queries
      table.index(['ticket_id', 'created_at'], 'idx_response_ticket_time');
    });
    console.log('  ✓ Created table: support_responses');
  } else {
    console.log('  ℹ️  Table support_responses already exists');
  }

  console.log('✅ Migration 005 completed: Admin features added');
}

export async function down(knex) {
  console.log('⬇️  Migration 005: Reverting admin features...');

  // Drop support_responses table (has foreign key to support_tickets)
  const hasResponsesTable = await knex.schema.hasTable('support_responses');
  if (hasResponsesTable) {
    await knex.schema.dropTableIfExists('support_responses');
    console.log('  ✓ Dropped table: support_responses');
  }

  // Remove columns from support_tickets
  const hasResponseStatusColumn = await knex.schema.hasColumn('support_tickets', 'response_status');
  if (hasResponseStatusColumn) {
    await knex.schema.table('support_tickets', (table) => {
      table.dropColumn('response_status');
    });
    console.log('  ✓ Dropped column: support_tickets.response_status');
  }

  const hasUserIdColumn = await knex.schema.hasColumn('support_tickets', 'user_id');
  if (hasUserIdColumn) {
    await knex.schema.table('support_tickets', (table) => {
      table.dropForeign(['user_id']);
      table.dropColumn('user_id');
    });
    console.log('  ✓ Dropped column: support_tickets.user_id');
  }

  console.log('✅ Migration 005 reverted: Admin features removed');
}
