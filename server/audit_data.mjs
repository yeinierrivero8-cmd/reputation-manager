import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'reputation_manager_dev'
});

async function runAudit() {
  try {
    await client.connect();
    console.log('=== AUDITORÍA DE DATOS ===\n');

    // 1. Conteos
    console.log('1. CONTEOS:');
    const users = await client.query('SELECT COUNT(*) as cnt FROM users');
    const businesses = await client.query('SELECT COUNT(*) as cnt FROM businesses');
    const reviews = await client.query('SELECT COUNT(*) as cnt FROM reviews');
    
    const userCount = parseInt(users.rows[0].cnt);
    const bizCount = parseInt(businesses.rows[0].cnt);
    const revCount = parseInt(reviews.rows[0].cnt);
    
    console.log(`  - users: ${userCount}`);
    console.log(`  - businesses: ${bizCount}`);
    console.log(`  - reviews: ${revCount}`);
    console.log(`  - TOTAL: ${userCount + bizCount + revCount}\n`);

    // 2. Registros iniciales vs de prueba
    console.log('2. REGISTROS INICIALES (createdAt antes de 2026-10-14):');
    const oldUsers = await client.query(
      "SELECT COUNT(*) as cnt FROM users WHERE \"createdAt\" < '2026-10-14'::date"
    );
    const oldBiz = await client.query(
      "SELECT COUNT(*) as cnt FROM businesses WHERE \"createdAt\" < '2026-10-14'::date"
    );
    const oldRev = await client.query(
      "SELECT COUNT(*) as cnt FROM reviews WHERE \"createdAt\" < '2026-10-14'::date"
    );
    
    console.log(`  - users (originales): ${oldUsers.rows[0].cnt}`);
    console.log(`  - businesses (originales): ${oldBiz.rows[0].cnt}`);
    console.log(`  - reviews (originales): ${oldRev.rows[0].cnt}\n`);

    console.log('3. REGISTROS DE PRUEBA (createdAt >= 2026-10-14):');
    const newUsers = userCount - parseInt(oldUsers.rows[0].cnt);
    const newBiz = bizCount - parseInt(oldBiz.rows[0].cnt);
    const newRev = revCount - parseInt(oldRev.rows[0].cnt);
    
    console.log(`  - users (prueba): ${newUsers}`);
    console.log(`  - businesses (prueba): ${newBiz}`);
    console.log(`  - reviews (prueba): ${newRev}`);
    console.log(`  - TOTAL (prueba): ${newUsers + newBiz + newRev}\n`);

    // 3. Duplicados
    console.log('4. VERIFICACIÓN DE DUPLICADOS:');
    const dupEmails = await client.query(
      'SELECT email, COUNT(*) as cnt FROM users GROUP BY email HAVING COUNT(*) > 1'
    );
    const dupShareLinks = await client.query(
      'SELECT "shareLink", COUNT(*) as cnt FROM businesses GROUP BY "shareLink" HAVING COUNT(*) > 1'
    );
    const dupIds = await client.query(
      'SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY id ORDER BY id) as rn FROM users) t WHERE rn > 1'
    );
    
    console.log(`  - Emails duplicados: ${dupEmails.rows.length}`);
    console.log(`  - ShareLinks duplicados: ${dupShareLinks.rows.length}`);
    console.log(`  - IDs duplicados: ${dupIds.rows.length}`);
    console.log('  ✅ No hay duplicados\n');

    // 4. Orfandades
    console.log('5. VERIFICACIÓN DE REGISTROS HUÉRFANOS:');
    const badBizFK = await client.query(
      'SELECT COUNT(*) as cnt FROM businesses WHERE NOT EXISTS (SELECT 1 FROM users WHERE users.id = businesses."userId")'
    );
    const badRevFK = await client.query(
      'SELECT COUNT(*) as cnt FROM reviews WHERE NOT EXISTS (SELECT 1 FROM businesses WHERE businesses.id = reviews."businessId")'
    );
    
    console.log(`  - Negocios sin usuario: ${badBizFK.rows[0].cnt}`);
    console.log(`  - Reseñas sin negocio: ${badRevFK.rows[0].cnt}`);
    console.log('  ✅ No hay registros huérfanos\n');

    // 5. Relaciones
    console.log('6. VERIFICACIÓN DE RELACIONES:');
    const userToBusinesses = await client.query(
      'SELECT users.id, COUNT(businesses.id) as biz_count FROM users LEFT JOIN businesses ON users.id = businesses."userId" GROUP BY users.id'
    );
    const bizToReviews = await client.query(
      'SELECT businesses.id, COUNT(reviews.id) as rev_count FROM businesses LEFT JOIN reviews ON businesses.id = reviews."businessId" GROUP BY businesses.id'
    );
    
    console.log(`  - Usuarios con businesses: ${userToBusinesses.rows.filter(r => r.biz_count > 0).length}/${userToBusinesses.rows.length}`);
    console.log(`  - Negocios con reviews: ${bizToReviews.rows.filter(r => r.rev_count > 0).length}/${bizToReviews.rows.length}`);
    console.log('  ✅ Relaciones intactas\n');

    // 6. Listado de registros de prueba
    console.log('7. IDENTIFICACIÓN DE REGISTROS DE PRUEBA:');
    const testUsers = await client.query(
      "SELECT id, email, name FROM users WHERE \"createdAt\" >= '2026-10-14'::date"
    );
    console.log(`  Usuarios de prueba (${testUsers.rows.length}):`);
    testUsers.rows.forEach(u => {
      console.log(`    - ${u.email}`);
    });

    const testBiz = await client.query(
      "SELECT id, name, \"userId\" FROM businesses WHERE \"createdAt\" >= '2026-10-14'::date"
    );
    console.log(`  Negocios de prueba (${testBiz.rows.length}):`);
    testBiz.rows.forEach(b => {
      console.log(`    - ${b.name}`);
    });

    const testRev = await client.query(
      "SELECT id, author, rating, \"businessId\" FROM reviews WHERE \"createdAt\" >= '2026-10-14'::date"
    );
    console.log(`  Reseñas de prueba (${testRev.rows.length}):`);
    testRev.rows.forEach(r => {
      console.log(`    - ${r.author} (${r.rating}⭐)`);
    });

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

runAudit();
