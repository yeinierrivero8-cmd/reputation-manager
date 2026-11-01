export async function up(knex) {
  await knex.schema.createTable('email_verifications', table => {
    table.string('id', 14).primary();
    table.string('userId', 14).notNullable().references('users.id').onDelete('CASCADE');
    table.string('email').notNullable();
    table.string('token', 128).notNullable().unique();
    table.boolean('verified').defaultTo(false);
    table.timestamp('expiresAt').notNullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.index(['token']);
    table.index(['userId']);
  });

  // Add emailVerified column to users table if not exists
  const hasColumn = await knex.schema.hasColumn('users', 'emailVerified');
  if (!hasColumn) {
    await knex.schema.alterTable('users', table => {
      table.boolean('emailVerified').defaultTo(false);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('email_verifications');
  const hasColumn = await knex.schema.hasColumn('users', 'emailVerified');
  if (hasColumn) {
    await knex.schema.alterTable('users', table => {
      table.dropColumn('emailVerified');
    });
  }
}
