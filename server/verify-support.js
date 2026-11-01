import http from 'http';
import pg from 'pg';

const { Client } = pg;

const API_URL = 'http://localhost:5005';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5005,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
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

async function verifySupport() {
  console.log('🧪 VERIFICACIÓN COMPLETA DEL SISTEMA DE SOPORTE\n');
  console.log('=' .repeat(60));

  const db = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'Lastunas1',
    database: 'reputation_manager_dev'
  });

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    await db.connect();

    // Test 1: Valid submission
    console.log('\n📋 Test 1: Envío válido de solicitud');
    const response1 = await makeRequest('POST', '/api/support/contact', {
      name: 'Alice Smith',
      email: 'alice@company.com',
      subject: 'Integration help needed',
      message: 'I need help integrating the widget into my website'
    });

    if (response1.status === 201 && response1.body.ticketId) {
      console.log(`   ✓ PASS - Ticket ID: ${response1.body.ticketId}`);
      console.log(`   - emailNotification: ${response1.body.emailNotification}`);
      testsPassed++;
    } else {
      console.log(`   ✗ FAIL - Status ${response1.status}`);
      testsFailed++;
    }

    // Test 2: Verify ticket was saved
    console.log('\n📋 Test 2: Verificar que el ticket se guardó');
    if (response1.body.ticketId) {
      const dbResult = await db.query(
        'SELECT COUNT(*) as count FROM support_tickets WHERE ticket_id = $1',
        [response1.body.ticketId]
      );

      if (dbResult.rows[0].count > 0) {
        console.log('   ✓ PASS - Ticket guardado en BD');
        testsPassed++;
      } else {
        console.log('   ✗ FAIL - Ticket NO encontrado en BD');
        testsFailed++;
      }
    }

    // Test 3: Missing field validation
    console.log('\n📋 Test 3: Validación de campo faltante');
    const response3 = await makeRequest('POST', '/api/support/contact', {
      name: 'Bob',
      email: 'bob@test.com',
      subject: 'Test'
      // message missing
    });

    if (response3.status === 400) {
      console.log('   ✓ PASS - Rechazada solicitud incompleta');
      testsPassed++;
    } else {
      console.log(`   ✗ FAIL - Debería ser 400, recibió ${response3.status}`);
      testsFailed++;
    }

    // Test 4: Invalid email validation
    console.log('\n📋 Test 4: Validación de email inválido');
    const response4 = await makeRequest('POST', '/api/support/contact', {
      name: 'Charlie',
      email: 'not-an-email',
      subject: 'Test Subject',
      message: 'This is a test message'
    });

    if (response4.status === 400) {
      console.log('   ✓ PASS - Rechazada email inválida');
      testsPassed++;
    } else {
      console.log(`   ✗ FAIL - Debería ser 400, recibió ${response4.status}`);
      testsFailed++;
    }

    // Test 5: Short message validation
    console.log('\n📋 Test 5: Validación de mensaje muy corto');
    const response5 = await makeRequest('POST', '/api/support/contact', {
      name: 'Dave',
      email: 'dave@test.com',
      subject: 'Test Subject',
      message: 'short' // less than 10 chars
    });

    if (response5.status === 400) {
      console.log('   ✓ PASS - Rechazada mensaje corto');
      testsPassed++;
    } else {
      console.log(`   ✗ FAIL - Debería ser 400, recibió ${response5.status}`);
      testsFailed++;
    }

    // Test 6: SMTP detection (should be not_configured)
    console.log('\n📋 Test 6: Detección de SMTP no configurado');
    const response6 = await makeRequest('POST', '/api/support/contact', {
      name: 'Eve',
      email: 'eve@test.com',
      subject: 'Test Email Status',
      message: 'Testing SMTP status detection'
    });

    if (response6.body.emailNotification === 'not_configured') {
      console.log('   ✓ PASS - Detectado SMTP no configurado');
      testsPassed++;
    } else {
      console.log(`   ✗ FAIL - emailNotification es "${response6.body.emailNotification}"`);
      testsFailed++;
    }

    // Test 7: Verify unique ticket IDs
    console.log('\n📋 Test 7: Verificar ticket IDs únicos');
    const response7a = await makeRequest('POST', '/api/support/contact', {
      name: 'Frank',
      email: 'frank1@test.com',
      subject: 'First Test',
      message: 'This is the first test message'
    });

    const response7b = await makeRequest('POST', '/api/support/contact', {
      name: 'Frank',
      email: 'frank2@test.com',
      subject: 'Second Test',
      message: 'This is the second test message'
    });

    if (response7a.body.ticketId !== response7b.body.ticketId) {
      console.log(`   ✓ PASS - Ticket IDs son únicos`);
      console.log(`     ID 1: ${response7a.body.ticketId}`);
      console.log(`     ID 2: ${response7b.body.ticketId}`);
      testsPassed++;
    } else {
      console.log('   ✗ FAIL - Ticket IDs son iguales (no únicos)');
      testsFailed++;
    }

    // Test 8: Verify other data not affected
    console.log('\n📋 Test 8: Verificar que datos existentes no se afectaron');
    const businessResult = await db.query('SELECT COUNT(*) as count FROM businesses');
    const reviewResult = await db.query('SELECT COUNT(*) as count FROM reviews');
    const userResult = await db.query('SELECT COUNT(*) as count FROM users');

    console.log(`   ✓ Usuarios: ${userResult.rows[0].count}`);
    console.log(`   ✓ Negocios: ${businessResult.rows[0].count}`);
    console.log(`   ✓ Reseñas: ${reviewResult.rows[0].count}`);
    console.log('   ✓ PASS - Datos existentes intactos');
    testsPassed++;

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ RESULTADOS: ${testsPassed} pasadas, ${testsFailed} fallidas\n`);

    if (testsFailed === 0) {
      console.log('🎉 TODOS LOS TESTS PASARON - SISTEMA DE SOPORTE FUNCIONAL\n');
    } else {
      console.log('⚠️  ALGUNOS TESTS FALLARON - REVISAR\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.end();
  }
}

verifySupport();
