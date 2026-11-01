export async function up(knex) {
  await knex.schema.createTable('refresh_tokens', table => {
    table.string('id', 14).primary();
    table.string('userId', 14).notNullable().references('users.id').onDelete('CASCADE');
    table.text('token').notNullable();
    table.timestamp('expiresAt').notNullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.index(['userId', 'expiresAt']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('refresh_tokens');
}
