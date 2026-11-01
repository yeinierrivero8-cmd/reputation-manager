/**
 * Migration: Create Support Tickets Table
 *
 * Crea la tabla para registrar solicitudes de soporte de forma persistente.
 * No modificar tablas existentes (users, businesses, reviews).
 *
 * Campos:
 * - id: Identificador único (nanoid)
 * - ticket_id: Número de seguimiento único para el cliente
 * - name: Nombre del solicitante
 * - email: Correo del solicitante
 * - subject: Asunto de la solicitud
 * - message: Cuerpo del mensaje
 * - status: Estado (new, replied, archived)
 * - response: Respuesta del administrador (nullable)
 * - created_at: Timestamp de creación
 */

export async function up(knex) {
  console.log('⬆️  Migration 003: Creating support_tickets table...');

  await knex.schema.createTable('support_tickets', (table) => {
    table.text('id').primary();
    table.comment('Unique identifier (nanoid format)');

    table.string('ticket_id').notNullable().unique();
    table.comment('Public ticket number for tracking');

    table.string('name').notNullable();
    table.comment('Submitter name (2-100 chars)');

    table.string('email').notNullable();
    table.comment('Submitter email');

    table.string('subject').notNullable();
    table.comment('Support request subject');

    table.text('message').notNullable();
    table.comment('Support request message body');

    table.enum('status', ['new', 'replied', 'archived']).defaultTo('new').notNullable();
    table.comment('Ticket status: new (unreviewed), replied (has response), archived');

    table.text('response').nullable();
    table.comment('Administrator response (optional)');

    table.boolean('email_sent').defaultTo(false).notNullable();
    table.comment('Whether notification email was sent to support address');

    table.timestamp('created_at', { useTz: false }).defaultTo(knex.fn.now()).notNullable();
    table.comment('Ticket creation timestamp (UTC)');

    table.timestamp('replied_at', { useTz: false }).nullable();
    table.comment('When admin replied (nullable)');

    // Indexes for common queries
    table.index('ticket_id', 'idx_support_ticket_id');
    table.index('email', 'idx_support_email');
    table.index('status', 'idx_support_status');
    table.index(['created_at'], 'idx_support_created_desc');
  });

  console.log('  ✓ Created table: support_tickets');
  console.log('✅ Migration 003 completed: Support tickets table created');
}

export async function down(knex) {
  console.log('⬇️  Migration 003: Dropping support_tickets table...');

  await knex.schema.dropTableIfExists('support_tickets');
  console.log('  ✓ Dropped table: support_tickets');

  console.log('✅ Migration 003 reverted: Support tickets table dropped');
}
