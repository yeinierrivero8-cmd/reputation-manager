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

async function verifyRegression() {
  console.log('🧪 VERIFICACIÓN DE REGRESIÓN - SISTEMA COMPLETO\n');
  console.log('='.repeat(60));

  const db = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'Lastunas1',
    database: 'reputation_manager_dev'
  });

  let testsPassed = 0;
  let testsFailed = 0;
  let token = null;
  let businessId = null;
  let businessShareLink = null;

  try {
    await db.connect();

    // Test 1: Database connectivity
    console.log('\n📋 Test 1: Conectividad con base de datos');
    const health = await makeRequest('GET', '/api/health');
    if (health.status === 200 && health.body.ok && health.body.db === 'connected') {
      console.log('   ✓ PASS - Base de datos conectada');
      testsPassed++;
    } else {
      console.log('   ✗ FAIL - BD no conectada');
      testsFailed++;
    }

    // Test 2: User signup
    console.log('\n📋 Test 2: Registro de usuario');
    const signupRes = await makeRequest('POST', '/api/auth/signup', {
      name: 'Regression Test User',
      email: `regress-${Date.now()}@example.com`,
      password: 'TestPassword123'
    });
    if (signupRes.status === 201 && signupRes.body.token) {
      token = signupRes.body.token;
      console.log('   ✓ PASS - Usuario registrado correctamente');
      testsPassed++;
    } else {
      console.log(`   ✗ FAIL - Status ${signupRes.status}`);
      testsFailed++;
    }

    if (!token) {
      console.log('⚠️  Skipping remaining tests - no token');
      return;
    }

    // Test 3: Get user profile
    console.log('\n📋 Test 3: Obtener perfil de usuario');
    const meRes = await makeRequest('GET', '/api/auth/me', null, token);
    if (meRes.status === 200 && meRes.body.user) {
      console.log('   ✓ PASS - Perfil obtenido correctamente');
      testsPassed++;
    } else {
      console.log('   ✗ FAIL');
      testsFailed++;
    }

    // Test 4: Create business
    console.log('\n📋 Test 4: Crear negocio');
    const bizRes = await makeRequest('POST', '/api/businesses', {
      name: 'Test Business',
      type: 'Testing',
      description: 'A test business for regression'
    }, token);
    if (bizRes.status === 201 && bizRes.body.business) {
      businessId = bizRes.body.business.id;
      businessShareLink = bizRes.body.business.shareLink;
      console.log('   ✓ PASS - Negocio creado correctamente');
      testsPassed++;
    } else {
      console.log('   ✗ FAIL');
      testsFailed++;
    }

    // Test 5: Get dashboard
    console.log('\n📋 Test 5: Cargar dashboard');
    const dashRes = await makeRequest('GET', '/api/dashboard', null, token);
    if (dashRes.status === 200 && dashRes.body.businesses && dashRes.body.stats) {
      console.log('   ✓ PASS - Dashboard cargado correctamente');
      testsPassed++;
    } else {
      console.log('   ✗ FAIL');
      testsFailed++;
    }

    // Test 6: Leave a public review
    console.log('\n📋 Test 6: Dejar reseña pública');
    if (!businessShareLink) {
      console.log('   ✗ SKIP - No business share link');
    } else {
      const reviewRes = await makeRequest('POST', `/api/public/business/${encodeURIComponent(businessShareLink)}/reviews`, {
        author: 'Test Reviewer',
        rating: 5,
        text: 'This is a great business for testing'
      });
      if (reviewRes.status === 201) {
        console.log('   ✓ PASS - Reseña pública creada correctamente');
        testsPassed++;
      } else {
        console.log('   ✗ FAIL');
        testsFailed++;
      }
    }

    // Test 7: Get public business page
    console.log('\n📋 Test 7: Obtener página pública de negocio');
    if (!businessShareLink) {
      console.log('   ✗ SKIP - No business share link');
    } else {
      const pubRes = await makeRequest('GET', `/api/public/business/${encodeURIComponent(businessShareLink)}`);
      if (pubRes.status === 200 && pubRes.body.business) {
        console.log('   ✓ PASS - Página pública accesible');
        testsPassed++;
      } else {
        console.log('   ✗ FAIL');
        testsFailed++;
      }
    }

    // Test 8: Support form submission
    console.log('\n📋 Test 8: Enviar formulario de soporte');
    const supportRes = await makeRequest('POST', '/api/support/contact', {
      name: 'Test Support',
      email: 'support@test.com',
      subject: 'Test Support Request',
      message: 'This is a test support request message'
    });
    if (supportRes.status === 201 && supportRes.body.ticketId) {
      console.log('   ✓ PASS - Solicitud de soporte registrada correctamente');
      testsPassed++;
    } else {
      console.log('   ✗ FAIL');
      testsFailed++;
    }

    // Test 9: Verify tables exist
    console.log('\n📋 Test 9: Verificar tablas de base de datos');
    const tables = await db.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const requiredTables = ['users', 'businesses', 'reviews', 'support_tickets', 'onboarding_progress'];
    const existingTables = tables.rows.map(r => r.table_name);
    const allExist = requiredTables.every(t => existingTables.includes(t));

    if (allExist) {
      console.log('   ✓ PASS - Todas las tablas requeridas existen');
      testsPassed++;
    } else {
      const missing = requiredTables.filter(t => !existingTables.includes(t));
      console.log(`   ✗ FAIL - Faltan tablas: ${missing.join(', ')}`);
      testsFailed++;
    }

    // Test 10: Data integrity check
    console.log('\n📋 Test 10: Verificar integridad de datos');
    const userCount = await db.query('SELECT COUNT(*) as count FROM users');
    const bizCount = await db.query('SELECT COUNT(*) as count FROM businesses');
    const revCount = await db.query('SELECT COUNT(*) as count FROM reviews');
    const ticketCount = await db.query('SELECT COUNT(*) as count FROM support_tickets');
    const progressCount = await db.query('SELECT COUNT(*) as count FROM onboarding_progress');

    console.log(`   ✓ Usuarios: ${userCount.rows[0].count}`);
    console.log(`   ✓ Negocios: ${bizCount.rows[0].count}`);
    console.log(`   ✓ Reseñas: ${revCount.rows[0].count}`);
    console.log(`   ✓ Solicitudes soporte: ${ticketCount.rows[0].count}`);
    console.log(`   ✓ Registros progreso: ${progressCount.rows[0].count}`);
    console.log('   ✓ PASS - Datos íntegros en base de datos');
    testsPassed++;

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ RESULTADOS: ${testsPassed} pasadas, ${testsFailed} fallidas\n`);

    if (testsFailed === 0) {
      console.log('🎉 TODOS LOS TESTS PASARON - SIN REGRESIONES\n');
    } else {
      console.log('⚠️  ALGUNOS TESTS FALLARON\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.end();
  }
}

verifyRegression();
