export async function up(knex) {
  // Modify description column to have max length
  const hasDescriptionColumn = await knex.schema.hasColumn('businesses', 'description');
  if (hasDescriptionColumn) {
    // Get all existing descriptions
    const existingBusinesses = await knex('businesses').select('id', 'description');

    // Truncate descriptions > 1000 chars
    for (const business of existingBusinesses) {
      if (business.description && business.description.length > 1000) {
        await knex('businesses').where('id', business.id).update({
          description: business.description.substring(0, 1000)
        });
      }
    }
  }

  // Create password_reset_tokens table
  await knex.schema.createTable('password_reset_tokens', table => {
    table.string('id', 14).primary();
    table.string('userId', 14).notNullable().references('users.id').onDelete('CASCADE');
    table.string('token', 128).notNullable().unique();
    table.boolean('used').defaultTo(false);
    table.timestamp('expiresAt').notNullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.index(['token']);
    table.index(['userId']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('password_reset_tokens');
}
