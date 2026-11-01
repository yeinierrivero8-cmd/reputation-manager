export async function up(knex) {
  await knex.schema.createTable('audit_logs', table => {
    table.string('id', 14).primary();
    table.string('userId', 14).notNullable().references('users.id').onDelete('CASCADE');
    table.string('action', 50).notNullable(); // created, updated, deleted
    table.string('entityType', 50).notNullable(); // business, review, subscription
    table.string('entityId', 14).notNullable();
    table.text('changes'); // JSON: {field: {old, new}}
    table.string('ipAddress', 45);
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.index(['userId', 'createdAt']);
    table.index(['entityId']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('audit_logs');
}
