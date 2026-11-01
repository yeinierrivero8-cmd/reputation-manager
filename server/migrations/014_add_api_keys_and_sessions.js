export async function up(knex) {
  // API keys for widget authentication
  await knex.schema.createTable('api_keys', table => {
    table.string('id', 14).primary();
    table.string('userId', 14).notNullable().references('users.id').onDelete('CASCADE');
    table.string('key', 100).notNullable().unique(); // rm_xxxxx
    table.string('name', 100).notNullable();
    table.boolean('active').defaultTo(true);
    table.timestamp('lastUsed');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.index(['userId']);
    table.index(['key']);
  });

  // Session tracking for security
  await knex.schema.createTable('sessions', table => {
    table.string('id', 14).primary();
    table.string('userId', 14).notNullable().references('users.id').onDelete('CASCADE');
    table.string('fingerprint', 64).notNullable(); // sha256(ip + user-agent)
    table.string('userAgent', 255);
    table.string('ipAddress', 45);
    table.boolean('active').defaultTo(true);
    table.timestamp('lastActivity').defaultTo(knex.fn.now());
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.index(['userId']);
    table.index(['fingerprint']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('sessions');
  await knex.schema.dropTableIfExists('api_keys');
}
