import pg from 'pg';

const { Client } = pg;

const db = new Client({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: 'Lastunas1',
  database: 'reputation_manager_dev'
});

(async () => {
  try {
    await db.connect();

    const result = await db.query('SELECT COUNT(*) as count FROM onboarding_progress');
    console.log('Total records in onboarding_progress:', result.rows[0].count);

    const unique = await db.query(`
      SELECT "userId", COUNT(*) as cnt
      FROM onboarding_progress
      GROUP BY "userId"
      HAVING COUNT(*) > 1
    `);

    if (unique.rows.length > 0) {
      console.log('\n❌ Duplicados encontrados:');
      unique.rows.forEach(row => {
        console.log(`   User ${row.userId}: ${row.cnt} registros`);
      });
    } else {
      console.log('✓ No hay duplicados - UNIQUE constraint funcionando correctamente');
    }

    const constraints = await db.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'onboarding_progress'
    `);

    console.log('\nConstraints en onboarding_progress:');
    constraints.rows.forEach(c => {
      console.log(`  - ${c.constraint_name} (${c.constraint_type})`);
    });

    await db.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
