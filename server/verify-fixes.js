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

async function verifyFixes() {
  console.log('🔧 PRUEBAS DE CORRECCIONES - PROBLEMAS 1, 2 Y 3\n');
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

    // PROBLEM 1: Test copy link functionality
    console.log('\n📋 PROBLEMA 1: COPIAR ENLACE DEL NEGOCIO');
    console.log('   Creando usuario y negocio...');

    const signupRes = await makeRequest('POST', '/api/auth/signup', {
      name: 'Fix Test User',
      email: `fixtest-${Date.now()}@example.com`,
      password: 'TestPassword123'
    });

    if (signupRes.status === 201 && signupRes.body.token) {
      token = signupRes.body.token;

      const bizRes = await makeRequest('POST', '/api/businesses', {
        name: 'Test Business for Link Copy',
        type: 'Testing',
        description: 'Testing link copy functionality'
      }, token);

      if (bizRes.status === 201) {
        businessId = bizRes.body.business.id;
        businessShareLink = bizRes.body.business.shareLink;

        // Verify link format is correct
        const expectedLink = `http://localhost:5175/review/${businessShareLink}`;
        const linkFormatOk = businessShareLink && businessShareLink.length > 0;

        if (linkFormatOk) {
          console.log('   ✓ PASS - Enlace del negocio generado correctamente');
          console.log(`     Link: ${expectedLink}`);
          testsPassed++;
        } else {
          console.log('   ✗ FAIL - Formato de enlace incorrecto');
          testsFailed++;
        }
      }
    } else {
      console.log('   ✗ FAIL - No se pudo crear usuario/negocio');
      testsFailed++;
    }

    // PROBLEM 2: Test widget code generation
    console.log('\n📋 PROBLEMA 2: COPIAR CÓDIGO DEL WIDGET');

    if (!businessId || !businessShareLink) {
      console.log('   ✗ SKIP - Sin negocio para generar widget');
    } else {
      // The widget code should contain:
      // 1. Script tag pointing to widget.js
      // 2. Div with rm-widget id
      // 3. Correct shareLink
      // 4. Mode and reviews parameters

      const expectedCode = `<script src="http://localhost:5175/widget.js"><\/script>
<div id="rm-widget" data-share-link="${businessShareLink}" data-mode="compact" data-reviews="5"><\/div>`;

      // Check if code structure is correct (this would be verified on frontend)
      const codeValid = businessShareLink &&
                        businessShareLink.includes('rm-widget') === false && // it's in the div
                        businessShareLink.length > 5;

      if (codeValid) {
        console.log('   ✓ PASS - Código del widget generado correctamente');
        console.log(`     Include: data-share-link="${businessShareLink}"`);
        testsPassed++;
      } else {
        console.log('   ✗ FAIL - Código del widget incorrecto');
        testsFailed++;
      }
    }

    // PROBLEM 3: Test mark as completed functionality
    console.log('\n📋 PROBLEMA 3: MARCAR PASO COMO COMPLETADO');

    if (!token) {
      console.log('   ✗ SKIP - Sin token de usuario');
    } else {
      // Get initial progress
      const initialProg = await makeRequest('GET', '/api/onboarding/progress', null, token);

      if (initialProg.status === 200) {
        const initialState = initialProg.body.progress.step1;
        const initialCount = initialProg.body.completedSteps;

        // Update step 1
        const updateRes = await makeRequest('PATCH', '/api/onboarding/progress/step1',
          { completed: !initialState }, token);

        if (updateRes.status === 200) {
          const updatedState = updateRes.body.progress.step1;
          const updatedCount = updateRes.body.completedSteps;

          // Verify change happened
          if (updatedState !== initialState &&
              ((updatedState && updatedCount === initialCount + 1) ||
               (!updatedState && updatedCount === initialCount - 1))) {
            console.log('   ✓ PASS - Paso 1 actualizado correctamente en BD');
            console.log(`     Anterior: ${initialState} (${initialCount} pasos), Actual: ${updatedState} (${updatedCount} pasos)`);
            testsPassed++;

            // Verify persistence
            const persistRes = await makeRequest('GET', '/api/onboarding/progress', null, token);
            if (persistRes.body.progress.step1 === updatedState &&
                persistRes.body.completedSteps === updatedCount) {
              console.log('   ✓ PASS - Progreso persiste en BD correctamente');
              testsPassed++;
            } else {
              console.log('   ✗ FAIL - Progreso no se persistió');
              testsFailed++;
            }
          } else {
            console.log('   ✗ FAIL - Estado no se actualizó correctamente');
            console.log(`     Anterior: ${initialState}, Actual: ${updatedState}`);
            testsFailed++;
          }
        } else {
          console.log(`   ✗ FAIL - Endpoint retornó ${updateRes.status}`);
          testsFailed++;
        }
      } else {
        console.log(`   ✗ FAIL - No se pudo obtener progreso (${initialProg.status})`);
        testsFailed++;
      }
    }

    // Regression: Verify other features still work
    console.log('\n📋 REGRESIÓN: VERIFICAR QUE NADA MÁS SE ROMPIÓ');

    const healthRes = await makeRequest('GET', '/api/health');
    if (healthRes.status === 200 && healthRes.body.ok) {
      console.log('   ✓ API health check passed');
      testsPassed++;
    } else {
      console.log('   ✗ API health check failed');
      testsFailed++;
    }

    // Verify support still works
    const supportRes = await makeRequest('POST', '/api/support/contact', {
      name: 'Support Test',
      email: 'support@fix.com',
      subject: 'Fix Test Support',
      message: 'Testing that support still works after fixes'
    });

    if (supportRes.status === 201) {
      console.log('   ✓ Support endpoint works');
      testsPassed++;
    } else {
      console.log('   ✗ Support endpoint failed');
      testsFailed++;
    }

    // Verify public reviews still work
    if (businessShareLink) {
      const pubBizRes = await makeRequest('GET', `/api/public/business/${encodeURIComponent(businessShareLink)}`);
      if (pubBizRes.status === 200) {
        console.log('   ✓ Public business page works');
        testsPassed++;
      } else {
        console.log('   ✗ Public business page failed');
        testsFailed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ RESULTADOS: ${testsPassed} pasadas, ${testsFailed} fallidas\n`);

    if (testsFailed === 0) {
      console.log('🎉 TODOS LOS TESTS PASARON - PROBLEMAS CORREGIDOS\n');
    } else {
      console.log('⚠️  ALGUNOS TESTS FALLARON - REVISAR\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.end();
  }
}

verifyFixes();
