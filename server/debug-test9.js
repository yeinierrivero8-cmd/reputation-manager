import http from 'http';
import pg from 'pg';

const { Client } = pg;

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5005,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

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

    // Create User 1
    console.log('📝 Creando Usuario 1...');
    const user1Res = await makeRequest('POST', '/api/auth/signup', {
      name: 'Debug Test User 1',
      email: `debug-${Date.now()}-1@example.com`,
      password: 'TestPassword123'
    });
    const user1Id = user1Res.body.user.id;
    const user1Token = user1Res.body.token;
    console.log(`✓ Usuario 1 creado: ${user1Id}`);

    // Get initial progress for User 1
    const prog1 = await makeRequest('GET', '/api/onboarding/progress', null, user1Token);
    console.log(`✓ Progreso inicial User 1: ${JSON.stringify(prog1.body)}`);

    // Mark some steps for User 1
    await makeRequest('PATCH', '/api/onboarding/progress/step1', { completed: true }, user1Token);
    console.log('✓ User 1 marcó paso 1');

    // Check DB records for User 1
    const user1Records = await db.query(
      'SELECT COUNT(*) as count FROM onboarding_progress WHERE "userId" = $1',
      [user1Id]
    );
    console.log(`✓ Registros en DB para User 1: ${user1Records.rows[0].count}`);

    // Create User 2
    console.log('\n📝 Creando Usuario 2...');
    const user2Res = await makeRequest('POST', '/api/auth/signup', {
      name: 'Debug Test User 2',
      email: `debug-${Date.now()}-2@example.com`,
      password: 'TestPassword123'
    });
    const user2Id = user2Res.body.user.id;
    const user2Token = user2Res.body.token;
    console.log(`✓ Usuario 2 creado: ${user2Id}`);

    // Check DB records for User 2
    const user2Records = await db.query(
      'SELECT COUNT(*) as count FROM onboarding_progress WHERE "userId" = $1',
      [user2Id]
    );
    console.log(`✓ Registros en DB para User 2: ${user2Records.rows[0].count}`);

    // Check again for User 1
    const user1RecordsAgain = await db.query(
      'SELECT COUNT(*) as count FROM onboarding_progress WHERE "userId" = $1',
      [user1Id]
    );
    console.log(`✓ Registros en DB para User 1 (de nuevo): ${user1RecordsAgain.rows[0].count}`);

    // Check all records
    const allRecords = await db.query('SELECT COUNT(*) as count FROM onboarding_progress');
    console.log(`\nTotal registros en tabla: ${allRecords.rows[0].count}`);

    // Check for any duplicates
    const dups = await db.query(`
      SELECT "userId", COUNT(*) as cnt FROM onboarding_progress GROUP BY "userId" HAVING COUNT(*) > 1
    `);
    if (dups.rows.length > 0) {
      console.log('❌ Duplicados encontrados:');
      dups.rows.forEach(r => console.log(`   ${r.userId}: ${r.cnt}`));
    } else {
      console.log('✓ No hay duplicados');
    }

    await db.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
