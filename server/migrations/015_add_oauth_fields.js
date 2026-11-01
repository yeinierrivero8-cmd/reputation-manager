export async function up(knex) {
  const hasGoogleId = await knex.schema.hasColumn('users', 'googleId');
  if (!hasGoogleId) {
    await knex.schema.table('users', table => {
      table.string('googleId').nullable().unique();
      table.string('appleId').nullable().unique();
    });
  }
}

export async function down(knex) {
  await knex.schema.table('users', table => {
    table.dropColumnIfExists('googleId');
    table.dropColumnIfExists('appleId');
  });
}
