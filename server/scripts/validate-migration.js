/**
 * FASE 3B: Script de Validación de Migración
 *
 * Verifica que la migración JSON → PostgreSQL fue exitosa:
 * - Conteos por tabla
 * - Identificadores únicos
 * - Relaciones foráneas
 * - Campos y valores críticos
 * - Fechas y restricciones
 * - Integridad referencial
 *
 * USO:
 * node scripts/validate-migration.js [--pre | --post | --compare]
 *
 * --pre:     Verificar JSON antes de migración
 * --post:    Verificar PostgreSQL después de migración
 * --compare: Comparar JSON vs PostgreSQL
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const knex = (await import('knex')).default;
const knexfile = await import('../knexfile.js');
const db = knex(knexfile.default.development);

const JSON_FILE = path.join(__dirname, '../data/db.json');

// ============================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================

function loadJson() {
  return JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
}

async function validatePre() {
  console.log('=== VALIDACIÓN PRE-MIGRACIÓN (JSON) ===');
  console.log('');

  const data = loadJson();
  let allOk = true;

  // 1. Conteos
  console.log('1️⃣  Conteos:');
  console.log('   - users:      ' + data.users.length);
  console.log('   - businesses: ' + data.businesses.length);
  console.log('   - reviews:    ' + data.reviews.length);
  const total = data.users.length + data.businesses.length + data.reviews.length;
  console.log('   - TOTAL:      ' + total);

  if (data.users.length !== 6 || data.businesses.length !== 7 || data.reviews.length !== 8) {
    console.log('   ⚠️  Conteos NO coinciden con lo esperado (6-7-8)');
    allOk = false;
  } else {
    console.log('   ✅ Conteos correctos');
  }
  console.log('');

  // 2. IDs únicos
  console.log('2️⃣  IDs únicos:');
  const userIds = new Set();
  let dupUsers = 0;
  data.users.forEach(u => {
    if (userIds.has(u.id)) dupUsers++;
    userIds.add(u.id);
  });

  const bizIds = new Set();
  let dupBiz = 0;
  data.businesses.forEach(b => {
    if (bizIds.has(b.id)) dupBiz++;
    bizIds.add(b.id);
  });

  const revIds = new Set();
  let dupRev = 0;
  data.reviews.forEach(r => {
    if (revIds.has(r.id)) dupRev++;
    revIds.add(r.id);
  });

  if (dupUsers || dupBiz || dupRev) {
    console.log('   ❌ Duplicados detectados:');
    console.log('      - users:      ' + dupUsers);
    console.log('      - businesses: ' + dupBiz);
    console.log('      - reviews:    ' + dupRev);
    allOk = false;
  } else {
    console.log('   ✅ No hay duplicados');
  }
  console.log('');

  // 3. Campos obligatorios
  console.log('3️⃣  Campos obligatorios:');
  let fieldOk = true;

  data.users.forEach((u, i) => {
    if (!u.id || !u.email || !u.passwordHash || !u.name || !u.createdAt) {
      console.log('   ❌ Usuario ' + i + ': campos faltantes');
      fieldOk = false;
    }
  });

  data.businesses.forEach((b, i) => {
    if (!b.id || !b.userId || !b.name || !b.type || !b.description || !b.shareLink || !b.createdAt) {
      console.log('   ❌ Negocio ' + i + ': campos faltantes');
      fieldOk = false;
    }
  });

  data.reviews.forEach((r, i) => {
    if (!r.id || !r.businessId || !r.author || r.rating === undefined || !r.text || !r.platform || !r.createdAt) {
      console.log('   ❌ Reseña ' + i + ': campos faltantes');
      fieldOk = false;
    }
  });

  if (fieldOk) {
    console.log('   ✅ Todos los campos obligatorios presentes');
  } else {
    allOk = false;
  }
  console.log('');

  // 4. Relaciones
  console.log('4️⃣  Relaciones:');
  let relOk = true;

  data.businesses.forEach((b, i) => {
    const user = data.users.find(u => u.id === b.userId);
    if (!user) {
      console.log('   ❌ Negocio ' + i + ': userId no existe');
      relOk = false;
    }
  });

  data.reviews.forEach((r, i) => {
    const biz = data.businesses.find(b => b.id === r.businessId);
    if (!biz) {
      console.log('   ❌ Reseña ' + i + ': businessId no existe');
      relOk = false;
    }
  });

  if (relOk) {
    console.log('   ✅ Todas las relaciones válidas');
  } else {
    allOk = false;
  }
  console.log('');

  // 5. Restricciones
  console.log('5️⃣  Restricciones:');
  let constraintOk = true;

  const emails = new Set();
  data.users.forEach((u, i) => {
    if (emails.has(u.email)) {
      console.log('   ❌ Email duplicado: ' + u.email);
      constraintOk = false;
    }
    emails.add(u.email);
  });

  const shareLinks = new Set();
  data.businesses.forEach((b, i) => {
    if (shareLinks.has(b.shareLink)) {
      console.log('   ❌ ShareLink duplicado: ' + b.shareLink);
      constraintOk = false;
    }
    shareLinks.add(b.shareLink);
  });

  data.reviews.forEach((r, i) => {
    if (r.rating < 1 || r.rating > 5) {
      console.log('   ❌ Reseña ' + i + ': rating inválido (' + r.rating + ')');
      constraintOk = false;
    }
  });

  if (constraintOk) {
    console.log('   ✅ Todas las restricciones se cumplen');
  } else {
    allOk = false;
  }
  console.log('');

  return allOk;
}

async function validatePost() {
  console.log('=== VALIDACIÓN POST-MIGRACIÓN (PostgreSQL) ===');
  console.log('');

  let allOk = true;

  // 1. Conteos
  console.log('1️⃣  Conteos:');
  const userCount = await db('users').count('* as count');
  const bizCount = await db('businesses').count('* as count');
  const revCount = await db('reviews').count('* as count');

  console.log('   - users:      ' + userCount[0].count);
  console.log('   - businesses: ' + bizCount[0].count);
  console.log('   - reviews:    ' + revCount[0].count);
  const total = parseInt(userCount[0].count) + parseInt(bizCount[0].count) + parseInt(revCount[0].count);
  console.log('   - TOTAL:      ' + total);

  if (parseInt(userCount[0].count) !== 6 || parseInt(bizCount[0].count) !== 7 || parseInt(revCount[0].count) !== 8) {
    console.log('   ⚠️  Conteos NO coinciden con lo esperado (6-7-8)');
    allOk = false;
  } else {
    console.log('   ✅ Conteos correctos');
  }
  console.log('');

  // 2. Restricciones únicas
  console.log('2️⃣  Restricciones únicas:');
  const dupEmails = await db.raw(`
    SELECT email, COUNT(*) as cnt FROM users GROUP BY email HAVING COUNT(*) > 1
  `);

  const dupShareLinks = await db.raw(`
    SELECT "shareLink", COUNT(*) as cnt FROM businesses GROUP BY "shareLink" HAVING COUNT(*) > 1
  `);

  if (dupEmails.rows.length > 0 || dupShareLinks.rows.length > 0) {
    console.log('   ❌ Duplicados detectados:');
    if (dupEmails.rows.length > 0) {
      console.log('      - Emails duplicados: ' + dupEmails.rows.length);
    }
    if (dupShareLinks.rows.length > 0) {
      console.log('      - ShareLinks duplicados: ' + dupShareLinks.rows.length);
    }
    allOk = false;
  } else {
    console.log('   ✅ No hay duplicados en campos únicos');
  }
  console.log('');

  // 3. Relaciones foráneas
  console.log('3️⃣  Integridad referencial:');
  const badBizFK = await db.raw(`
    SELECT b.id FROM businesses b
    WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = b."userId")
  `);

  const badRevFK = await db.raw(`
    SELECT r.id FROM reviews r
    WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = r."businessId")
  `);

  if (badBizFK.rows.length > 0 || badRevFK.rows.length > 0) {
    console.log('   ❌ Relaciones rotas:');
    if (badBizFK.rows.length > 0) {
      console.log('      - Negocios sin usuario: ' + badBizFK.rows.length);
    }
    if (badRevFK.rows.length > 0) {
      console.log('      - Reseñas sin negocio: ' + badRevFK.rows.length);
    }
    allOk = false;
  } else {
    console.log('   ✅ Todas las relaciones son válidas');
  }
  console.log('');

  // 4. Restricción CHECK (rating)
  console.log('4️⃣  CHECK constraints:');
  const badRating = await db.raw(`
    SELECT id FROM reviews WHERE rating < 1 OR rating > 5
  `);

  if (badRating.rows.length > 0) {
    console.log('   ❌ Ratings inválidos: ' + badRating.rows.length);
    allOk = false;
  } else {
    console.log('   ✅ Todos los ratings están en rango 1-5');
  }
  console.log('');

  return allOk;
}

async function compare() {
  console.log('=== COMPARACIÓN: JSON vs PostgreSQL ===');
  console.log('');

  const data = loadJson();
  let allOk = true;

  // Conteos
  console.log('1️⃣  Conteos:');
  const userCount = await db('users').count('* as count');
  const bizCount = await db('businesses').count('* as count');
  const revCount = await db('reviews').count('* as count');

  const userMatch = parseInt(userCount[0].count) === data.users.length;
  const bizMatch = parseInt(bizCount[0].count) === data.businesses.length;
  const revMatch = parseInt(revCount[0].count) === data.reviews.length;

  console.log('   - users:      JSON=' + data.users.length + ' PG=' + userCount[0].count + ' ' + (userMatch ? '✅' : '❌'));
  console.log('   - businesses: JSON=' + data.businesses.length + ' PG=' + bizCount[0].count + ' ' + (bizMatch ? '✅' : '❌'));
  console.log('   - reviews:    JSON=' + data.reviews.length + ' PG=' + revCount[0].count + ' ' + (revMatch ? '✅' : '❌'));

  if (!userMatch || !bizMatch || !revMatch) {
    allOk = false;
  }
  console.log('');

  // IDs por tabla
  console.log('2️⃣  Verificación de IDs:');

  const pgUsers = await db('users').select('id').orderBy('id');
  let userIdOk = true;
  for (const jsonUser of data.users) {
    const pgUser = pgUsers.find(u => u.id === jsonUser.id);
    if (!pgUser) {
      console.log('   ❌ Usuario no encontrado: ' + jsonUser.id);
      userIdOk = false;
    }
  }

  const pgBiz = await db('businesses').select('id').orderBy('id');
  let bizIdOk = true;
  for (const jsonBiz of data.businesses) {
    const pgB = pgBiz.find(b => b.id === jsonBiz.id);
    if (!pgB) {
      console.log('   ❌ Negocio no encontrado: ' + jsonBiz.id);
      bizIdOk = false;
    }
  }

  const pgRev = await db('reviews').select('id').orderBy('id');
  let revIdOk = true;
  for (const jsonRev of data.reviews) {
    const pgR = pgRev.find(r => r.id === jsonRev.id);
    if (!pgR) {
      console.log('   ❌ Reseña no encontrada: ' + jsonRev.id);
      revIdOk = false;
    }
  }

  if (userIdOk && bizIdOk && revIdOk) {
    console.log('   ✅ Todos los IDs coinciden');
  } else {
    allOk = false;
  }
  console.log('');

  // Resumen
  console.log('📊 Resumen:');
  if (allOk) {
    console.log('✅ Migración verificada correctamente');
  } else {
    console.log('❌ Hay discrepancias en la migración');
  }
  console.log('');

  return allOk;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  try {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║ FASE 3B: Validación de Migración                      ║');
    console.log('║ ReputationManager Migration Validator                 ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');

    const mode = process.argv[2] || '--pre';

    let success;
    switch (mode) {
      case '--pre':
        success = await validatePre();
        break;
      case '--post':
        success = await validatePost();
        break;
      case '--compare':
        success = await compare();
        break;
      default:
        console.log('Modos: --pre | --post | --compare');
        process.exit(1);
    }

    console.log('');
    if (success) {
      console.log('✅ Validación EXITOSA');
    } else {
      console.log('⚠️  Validación completada con advertencias');
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

await main();
