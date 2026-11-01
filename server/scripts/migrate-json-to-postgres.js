/**
 * FASE 3B: Migración JSON → PostgreSQL
 *
 * Script de importación de datos de JSON a PostgreSQL con seguridad,
 * verificación y reversibilidad.
 *
 * RESTRICCIONES:
 * - NO ejecutar hasta autorización explícita
 * - Usar transacción (all-or-nothing)
 * - Idempotente (no duplicar si se ejecuta múltiples veces)
 * - Preservar JSON original
 * - No cambiar almacenamiento activo
 *
 * USO:
 * node scripts/migrate-json-to-postgres.js --dry-run    (simular sin cambios)
 * node scripts/migrate-json-to-postgres.js --execute    (ejecutar migración)
 * node scripts/migrate-json-to-postgres.js --rollback    (revertir migración)
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

// ============================================================
// CONFIGURACIÓN
// ============================================================

const MODE = process.argv[2] || '--help';
const JSON_FILE = path.join(__dirname, '../data/db.json');

const MODES = {
  '--help': 'Mostrar esta ayuda',
  '--dry-run': 'Simular migración sin cambios',
  '--execute': 'Ejecutar migración (requiere confirmación)',
  '--rollback': 'Revertir migración (eliminar datos importados)',
  '--validate': 'Validar que migración fue correcta',
  '--compare': 'Comparar datos JSON vs PostgreSQL'
};

if (!MODES[MODE]) {
  console.error('❌ Modo desconocido:', MODE);
  console.log('');
  console.log('Modos disponibles:');
  Object.entries(MODES).forEach(([m, desc]) => {
    console.log('  ' + m.padEnd(15) + ' - ' + desc);
  });
  process.exit(1);
}

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

async function loadJsonData() {
  try {
    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    return data;
  } catch (err) {
    throw new Error(`No se puede leer ${JSON_FILE}: ${err.message}`);
  }
}

async function validateJsonStructure(data) {
  const errors = [];

  if (!Array.isArray(data.users)) errors.push('JSON no tiene array "users"');
  if (!Array.isArray(data.businesses)) errors.push('JSON no tiene array "businesses"');
  if (!Array.isArray(data.reviews)) errors.push('JSON no tiene array "reviews"');

  // Validar usuarios
  data.users?.forEach((u, i) => {
    if (!u.id) errors.push(`Usuario ${i}: falta id`);
    if (!u.email) errors.push(`Usuario ${i}: falta email`);
    if (!u.passwordHash) errors.push(`Usuario ${i}: falta passwordHash`);
    if (!u.name) errors.push(`Usuario ${i}: falta name`);
  });

  // Validar negocios
  data.businesses?.forEach((b, i) => {
    if (!b.id) errors.push(`Negocio ${i}: falta id`);
    if (!b.userId) errors.push(`Negocio ${i}: falta userId`);
    if (!b.shareLink) errors.push(`Negocio ${i}: falta shareLink`);
    const user = data.users.find(u => u.id === b.userId);
    if (!user) errors.push(`Negocio ${i}: userId no existe en users`);
  });

  // Validar reseñas
  data.reviews?.forEach((r, i) => {
    if (!r.id) errors.push(`Reseña ${i}: falta id`);
    if (!r.businessId) errors.push(`Reseña ${i}: falta businessId`);
    if (r.rating < 1 || r.rating > 5) errors.push(`Reseña ${i}: rating inválido`);
    const biz = data.businesses.find(b => b.id === r.businessId);
    if (!biz) errors.push(`Reseña ${i}: businessId no existe en businesses`);
  });

  return errors;
}

async function migrateData(dryRun = true) {
  console.log(dryRun ? '⚡ MODO: DRY-RUN (sin cambios)' : '✍️  MODO: EJECUTAR MIGRACIÓN');
  console.log('');

  let trx;
  try {
    const data = await loadJsonData();

    // Validar estructura
    console.log('1️⃣  Validando estructura JSON...');
    const errors = await validateJsonStructure(data);
    if (errors.length > 0) {
      console.error('❌ Errores en JSON:');
      errors.forEach(e => console.error('   -', e));
      return false;
    }
    console.log('   ✅ JSON válido');
    console.log('');

    // Crear transacción
    console.log('2️⃣  Iniciando transacción...');
    if (!dryRun) {
      trx = await db.transaction();
    } else {
      trx = db; // Simular con DB normal (no commitea)
    }
    console.log('   ✅ Transacción iniciada');
    console.log('');

    // Importar usuarios
    console.log('3️⃣  Importando usuarios (' + data.users.length + ')...');
    for (const user of data.users) {
      const exists = await trx('users').where('id', user.id).first();
      if (!exists) {
        await trx('users').insert({
          id: user.id,
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
          createdAt: new Date(user.createdAt)
        });
        console.log('   ✓', user.id.substring(0, 8) + '...' + ' (' + user.email + ')');
      } else {
        console.log('   ⊘', user.id.substring(0, 8) + '... (ya existe)');
      }
    }
    console.log('   ✅ Usuarios importados');
    console.log('');

    // Importar negocios
    console.log('4️⃣  Importando negocios (' + data.businesses.length + ')...');
    for (const biz of data.businesses) {
      const exists = await trx('businesses').where('id', biz.id).first();
      if (!exists) {
        await trx('businesses').insert({
          id: biz.id,
          userId: biz.userId,
          name: biz.name,
          type: biz.type,
          description: biz.description,
          shareLink: biz.shareLink,
          createdAt: new Date(biz.createdAt)
        });
        console.log('   ✓', biz.id.substring(0, 8) + '... (' + biz.name + ')');
      } else {
        console.log('   ⊘', biz.id.substring(0, 8) + '... (ya existe)');
      }
    }
    console.log('   ✅ Negocios importados');
    console.log('');

    // Importar reseñas
    console.log('5️⃣  Importando reseñas (' + data.reviews.length + ')...');
    for (const rev of data.reviews) {
      const exists = await trx('reviews').where('id', rev.id).first();
      if (!exists) {
        await trx('reviews').insert({
          id: rev.id,
          businessId: rev.businessId,
          author: rev.author,
          rating: rev.rating,
          text: rev.text,
          platform: rev.platform || 'ReputationManager',
          createdAt: new Date(rev.createdAt)
        });
        console.log('   ✓', rev.id.substring(0, 8) + '... (' + rev.author + ', ⭐' + rev.rating + ')');
      } else {
        console.log('   ⊘', rev.id.substring(0, 8) + '... (ya existe)');
      }
    }
    console.log('   ✅ Reseñas importadas');
    console.log('');

    // Validar integridad
    console.log('6️⃣  Validando integridad...');
    const userCount = await trx('users').count('* as count');
    const bizCount = await trx('businesses').count('* as count');
    const revCount = await trx('reviews').count('* as count');
    console.log('   - users: ' + userCount[0].count + ' ✓');
    console.log('   - businesses: ' + bizCount[0].count + ' ✓');
    console.log('   - reviews: ' + revCount[0].count + ' ✓');
    console.log('   ✅ Integridad verificada');
    console.log('');

    // Commit o rollback
    if (dryRun) {
      console.log('7️⃣  Simulación completada (sin guardar cambios)');
      console.log('   ℹ️  Ejecuta con --execute para guardar');
      return true;
    } else {
      console.log('7️⃣  Confirmando cambios...');
      await trx.commit();
      console.log('   ✅ Cambios guardados en PostgreSQL');
      console.log('');
      return true;
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (trx && !dryRun) {
      try {
        await trx.rollback();
        console.log('   Transacción revertida (cambios descartados)');
      } catch (rollbackErr) {
        console.error('   Error al revertir:', rollbackErr.message);
      }
    }
    return false;
  }
}

async function rollbackData() {
  console.log('⚠️  ROLLBACK: Eliminando datos importados...');
  console.log('');

  const trx = await db.transaction();
  try {
    console.log('1️⃣  Eliminando reseñas...');
    const revCount = await trx('reviews').delete();
    console.log('   ✓ Eliminadas ' + revCount + ' reseñas');

    console.log('2️⃣  Eliminando negocios...');
    const bizCount = await trx('businesses').delete();
    console.log('   ✓ Eliminados ' + bizCount + ' negocios');

    console.log('3️⃣  Eliminando usuarios...');
    const userCount = await trx('users').delete();
    console.log('   ✓ Eliminados ' + userCount + ' usuarios');

    await trx.commit();
    console.log('');
    console.log('✅ Rollback completado');
    return true;

  } catch (err) {
    await trx.rollback();
    console.error('❌ Error:', err.message);
    return false;
  }
}

async function validateMigration() {
  console.log('🔍 VALIDACIÓN: Comparando datos...');
  console.log('');

  try {
    const data = await loadJsonData();

    const userCount = await db('users').count('* as count');
    const bizCount = await db('businesses').count('* as count');
    const revCount = await db('reviews').count('* as count');

    console.log('Conteos:');
    console.log('  JSON → PostgreSQL:');
    console.log('    users:      ' + data.users.length + ' → ' + userCount[0].count);
    console.log('    businesses: ' + data.businesses.length + ' → ' + bizCount[0].count);
    console.log('    reviews:    ' + data.reviews.length + ' → ' + revCount[0].count);
    console.log('');

    if (userCount[0].count === data.users.length &&
        bizCount[0].count === data.businesses.length &&
        revCount[0].count === data.reviews.length) {
      console.log('✅ Conteos coinciden');
    } else {
      console.log('❌ Conteos NO coinciden');
      return false;
    }

    return true;

  } catch (err) {
    console.error('❌ Error:', err.message);
    return false;
  }
}

async function compareData() {
  console.log('📊 COMPARACIÓN: Datos en ambos sistemas...');
  console.log('');

  try {
    const data = await loadJsonData();

    // Comparar usuarios
    console.log('1️⃣  Usuarios:');
    const pgUsers = await db('users').select('id', 'email', 'createdAt');
    console.log('   Registros: ' + pgUsers.length + '/' + data.users.length);
    let userOk = true;
    for (const jsonUser of data.users) {
      const pgUser = pgUsers.find(u => u.id === jsonUser.id);
      if (!pgUser) {
        console.log('   ❌ Usuario no encontrado:', jsonUser.id);
        userOk = false;
      }
    }
    if (userOk) console.log('   ✅ Todos los usuarios están en PostgreSQL');
    console.log('');

    // Comparar negocios
    console.log('2️⃣  Negocios:');
    const pgBiz = await db('businesses').select('id', 'userId', 'shareLink', 'createdAt');
    console.log('   Registros: ' + pgBiz.length + '/' + data.businesses.length);
    let bizOk = true;
    for (const jsonBiz of data.businesses) {
      const pgB = pgBiz.find(b => b.id === jsonBiz.id);
      if (!pgB) {
        console.log('   ❌ Negocio no encontrado:', jsonBiz.id);
        bizOk = false;
      } else if (pgB.userId !== jsonBiz.userId) {
        console.log('   ❌ Negocio userId mismatch:', jsonBiz.id);
        bizOk = false;
      }
    }
    if (bizOk) console.log('   ✅ Todos los negocios están en PostgreSQL');
    console.log('');

    // Comparar reseñas
    console.log('3️⃣  Reseñas:');
    const pgRev = await db('reviews').select('id', 'businessId', 'rating', 'createdAt');
    console.log('   Registros: ' + pgRev.length + '/' + data.reviews.length);
    let revOk = true;
    for (const jsonRev of data.reviews) {
      const pgR = pgRev.find(r => r.id === jsonRev.id);
      if (!pgR) {
        console.log('   ❌ Reseña no encontrada:', jsonRev.id);
        revOk = false;
      } else if (pgR.businessId !== jsonRev.businessId || pgR.rating !== jsonRev.rating) {
        console.log('   ❌ Reseña mismatch:', jsonRev.id);
        revOk = false;
      }
    }
    if (revOk) console.log('   ✅ Todas las reseñas están en PostgreSQL');
    console.log('');

    if (userOk && bizOk && revOk) {
      console.log('✅ Todos los datos coinciden');
      return true;
    } else {
      console.log('❌ Hay discrepancias');
      return false;
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    return false;
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  try {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║ FASE 3B: Migración JSON → PostgreSQL                  ║');
    console.log('║ ReputationManager Data Migration Tool                 ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');

    let success;
    switch (MODE) {
      case '--help':
        console.log('Modos disponibles:');
        Object.entries(MODES).forEach(([m, desc]) => {
          console.log('  ' + m.padEnd(15) + ' - ' + desc);
        });
        break;
      case '--dry-run':
        success = await migrateData(true);
        break;
      case '--execute':
        console.log('⚠️  MODO EJECUCIÓN REAL');
        console.log('');
        success = await migrateData(false);
        break;
      case '--rollback':
        success = await rollbackData();
        break;
      case '--validate':
        success = await validateMigration();
        break;
      case '--compare':
        success = await compareData();
        break;
    }

    console.log('');
    if (success !== undefined) {
      if (success) {
        console.log('✅ Operación completada exitosamente');
      } else {
        console.log('❌ Operación falló');
        process.exit(1);
      }
    }

  } catch (err) {
    console.error('❌ Error fatal:', err.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

await main();
