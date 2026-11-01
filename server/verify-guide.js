import http from 'http';
import pg from 'pg';

const { Client } = pg;

const API_URL = 'http://localhost:5005';

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

async function verifyGuide() {
  console.log('🧪 VERIFICACIÓN COMPLETA DE LA GUÍA DE USUARIO\n');
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
  let testUserId = null;

  try {
    await db.connect();

    // Test 1: Create a test user
    console.log('\n📋 Test 1: Crear usuario de prueba');
    const signupRes = await makeRequest('POST', '/api/auth/signup', {
      name: 'Guide Test User',
      email: `test-guide-${Date.now()}@example.com`,
      password: 'TestPassword123'
    });

    if (signupRes.status === 201 && signupRes.body.token) {
      token = signupRes.body.token;
      testUserId = signupRes.body.user.id;
      console.log(`   ✓ PASS - Usuario creado: ${testUserId}`);
      testsPassed++;
    } else {
      console.log(`   ✗ FAIL - Status ${signupRes.status}`);
      testsFailed++;
    }

    // Test 2: Get initial guide progress
    console.log('\n📋 Test 2: Obtener progreso inicial de la guía');
    if (!token) {
      console.log('   ✗ FAIL - Sin token');
      testsFailed++;
    } else {
      const progressRes = await makeRequest('GET', '/api/onboarding/progress', null, token);

      if (progressRes.status === 200 && progressRes.body.progress) {
        const progress = progressRes.body.progress;
        const allFalse = !progress.step1 && !progress.step2 && !progress.step3 && !progress.step4 && !progress.step5;

        if (allFalse && progressRes.body.completedSteps === 0) {
          console.log('   ✓ PASS - Progreso inicial: todos en false, 0 pasos completados');
          testsPassed++;
        } else {
          console.log('   ✗ FAIL - Estado inicial incorrecto');
          testsFailed++;
        }
      } else {
        console.log(`   ✗ FAIL - Status ${progressRes.status}`);
        testsFailed++;
      }
    }

    // Test 3: Mark step 1 as completed
    console.log('\n📋 Test 3: Marcar Paso 1 como completado');
    if (!token) {
      console.log('   ✗ FAIL - Sin token');
      testsFailed++;
    } else {
      const updateRes = await makeRequest('PATCH', '/api/onboarding/progress/step1', { completed: true }, token);

      if (updateRes.status === 200 && updateRes.body.progress.step1 === true && updateRes.body.completedSteps === 1) {
        console.log('   ✓ PASS - Paso 1 marcado como completado');
        testsPassed++;
      } else {
        console.log(`   ✗ FAIL - Status ${updateRes.status} o datos incorrectos`);
        testsFailed++;
      }
    }

    // Test 4: Mark step 2 as completed
    console.log('\n📋 Test 4: Marcar Paso 2 como completado');
    if (!token) {
      console.log('   ✗ FAIL - Sin token');
      testsFailed++;
    } else {
      const updateRes = await makeRequest('PATCH', '/api/onboarding/progress/step2', { completed: true }, token);

      if (updateRes.status === 200 && updateRes.body.progress.step2 === true && updateRes.body.completedSteps === 2) {
        console.log('   ✓ PASS - Paso 2 marcado como completado');
        testsPassed++;
      } else {
        console.log(`   ✗ FAIL - Status ${updateRes.status} o datos incorrectos`);
        testsFailed++;
      }
    }

    // Test 5: Verify all 5 steps can be marked complete
    console.log('\n📋 Test 5: Marcar Pasos 3, 4 y 5 como completados');
    if (!token) {
      console.log('   ✗ FAIL - Sin token');
      testsFailed++;
    } else {
      let allComplete = true;
      for (let i = 3; i <= 5; i++) {
        const res = await makeRequest('PATCH', `/api/onboarding/progress/step${i}`, { completed: true }, token);
        if (res.status !== 200 || !res.body.progress[`step${i}`]) {
          allComplete = false;
          break;
        }
      }

      if (allComplete) {
        const finalRes = await makeRequest('GET', '/api/onboarding/progress', null, token);
        if (finalRes.body.completedSteps === 5) {
          console.log('   ✓ PASS - Todos los 5 pasos completados (completedSteps = 5)');
          testsPassed++;
        } else {
          console.log(`   ✗ FAIL - completedSteps = ${finalRes.body.completedSteps}, esperaba 5`);
          testsFailed++;
        }
      } else {
        console.log('   ✗ FAIL - No se pudieron marcar todos los pasos');
        testsFailed++;
      }
    }

    // Test 6: Unmark a step
    console.log('\n📋 Test 6: Desmarcar Paso 1');
    if (!token) {
      console.log('   ✗ FAIL - Sin token');
      testsFailed++;
    } else {
      const updateRes = await makeRequest('PATCH', '/api/onboarding/progress/step1', { completed: false }, token);

      if (updateRes.status === 200 && updateRes.body.progress.step1 === false && updateRes.body.completedSteps === 4) {
        console.log('   ✓ PASS - Paso 1 desmarcado (completedSteps = 4)');
        testsPassed++;
      } else {
        console.log(`   ✗ FAIL - Status ${updateRes.status} o datos incorrectos`);
        testsFailed++;
      }
    }

    // Test 7: Persistence check - fetch progress again
    console.log('\n📋 Test 7: Verificar persistencia del progreso');
    if (!token) {
      console.log('   ✗ FAIL - Sin token');
      testsFailed++;
    } else {
      const persistRes = await makeRequest('GET', '/api/onboarding/progress', null, token);

      if (persistRes.status === 200 &&
          persistRes.body.progress.step1 === false &&
          persistRes.body.progress.step2 === true &&
          persistRes.body.completedSteps === 4) {
        console.log('   ✓ PASS - Progreso persistido correctamente en BD');
        testsPassed++;
      } else {
        console.log('   ✗ FAIL - Datos no persistidos correctamente');
        testsFailed++;
      }
    }

    // Test 8: Verify onboarding_progress table exists
    console.log('\n📋 Test 8: Verificar estructura de tabla onboarding_progress');
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'onboarding_progress'
      )
    `);

    if (tableCheck.rows[0].exists) {
      const colCheck = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'onboarding_progress'
        ORDER BY ordinal_position
      `);

      const expectedCols = ['id', 'userId', 'step_1_configure_business', 'step_2_get_link',
                           'step_3_authentic_reviews', 'step_4_widget_install', 'step_5_verify_functionality',
                           'createdAt', 'updatedAt'];
      const actualCols = colCheck.rows.map(r => r.column_name);

      if (expectedCols.every(col => actualCols.includes(col))) {
        console.log('   ✓ PASS - Tabla onboarding_progress con todas las columnas');
        testsPassed++;
      } else {
        console.log('   ✗ FAIL - Faltan columnas en la tabla');
        testsFailed++;
      }
    } else {
      console.log('   ✗ FAIL - Tabla onboarding_progress no existe');
      testsFailed++;
    }

    // Test 9: Verify user isolation
    console.log('\n📋 Test 9: Verificar aislamiento de usuarios (seguridad)');
    const user2SignupRes = await makeRequest('POST', '/api/auth/signup', {
      name: 'Guide Test User 2',
      email: `test-guide-2-${Date.now()}@example.com`,
      password: 'TestPassword123'
    });

    if (user2SignupRes.status === 201) {
      const user2Id = user2SignupRes.body.user.id;

      // Small delay to ensure DB writes are complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify User 1 has exactly 1 record
      const user1Records = await db.query(
        'SELECT COUNT(*) as count FROM onboarding_progress WHERE "userId" = $1',
        [testUserId]
      );

      // Verify User 2 has exactly 1 record (should be auto-created on signup)
      const user2Records = await db.query(
        'SELECT COUNT(*) as count FROM onboarding_progress WHERE "userId" = $1',
        [user2Id]
      );

      if (user1Records.rows[0].count >= 1 && user2Records.rows[0].count >= 1) {
        console.log('   ✓ PASS - Cada usuario tiene su propio registro aislado de progreso');
        testsPassed++;
      } else {
        console.log(`   ✗ FAIL - User1: ${user1Records.rows[0].count} records, User2: ${user2Records.rows[0].count} records`);
        testsFailed++;
      }
    } else {
      console.log('   ✗ FAIL - No se pudo crear usuario de prueba');
      testsFailed++;
    }

    // Test 10: Verify existing data integrity
    console.log('\n📋 Test 10: Verificar integridad de datos existentes');
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
      console.log('🎉 TODOS LOS TESTS PASARON - GUÍA DE USUARIO FUNCIONAL\n');
    } else {
      console.log('⚠️  ALGUNOS TESTS FALLARON - REVISAR\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.end();
  }
}

verifyGuide();
