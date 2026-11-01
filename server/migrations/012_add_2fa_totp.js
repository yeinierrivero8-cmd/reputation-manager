export async function up(knex) {
  await knex.schema.createTable('totp_secrets', table => {
    table.string('id', 14).primary();
    table.string('userId', 14).notNullable().unique().references('users.id').onDelete('CASCADE');
    table.text('secret').notNullable(); // Encrypted base32 secret
    table.boolean('enabled').defaultTo(false);
    table.text('backupCodes'); // JSON array of backup codes
    table.timestamp('enabledAt');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.index(['userId']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('totp_secrets');
}
