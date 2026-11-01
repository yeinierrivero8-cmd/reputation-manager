#!/usr/bin/env node
/**
 * FASE 1: Validación de Datos JSON
 * Script para verificar integridad de base de datos antes de migración
 * NO MODIFICA DATOS - Solo lectura y reporte
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, '../data/db.json');

async function validateData() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  FASE 1: VALIDACIÓN DE INTEGRIDAD DE DATOS JSON            ║');
  console.log('║  Estado: SOLO LECTURA - SIN MODIFICACIONES                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    const content = await fs.readFile(DB_FILE, 'utf8');
    const db = JSON.parse(content);

    // 1. Conteo de registros
    console.log('📊 CONTEO DE REGISTROS:');
    console.log(`  ✓ Usuarios: ${db.users.length}`);
    console.log(`  ✓ Negocios: ${db.businesses.length}`);
    console.log(`  ✓ Reseñas: ${db.reviews.length}`);
    console.log();

    // 2. Validar emails únicos
    console.log('📧 VALIDACIÓN DE EMAILS ÚNICOS:');
    const emails = db.users.map(u => u.email);
    const uniqueEmails = new Set(emails);
    if (emails.length === uniqueEmails.size) {
      console.log(`  ✓ Todos los ${emails.length} emails son únicos`);
    } else {
      console.log(`  ❌ ERROR: ${emails.length - uniqueEmails.size} duplicados encontrados`);
      emails.forEach((e, i) => {
        if (emails.indexOf(e) !== i) {
          console.log(`     - "${e}" (id: ${db.users[i].id})`);
        }
      });
    }
    console.log();

    // 3. Validar shareLinks únicos
    console.log('🔗 VALIDACIÓN DE SHARELINKS ÚNICOS:');
    const shareLinks = db.businesses.map(b => b.shareLink);
    const uniqueShareLinks = new Set(shareLinks);
    if (shareLinks.length === uniqueShareLinks.size) {
      console.log(`  ✓ Todos los ${shareLinks.length} shareLinks son únicos`);
    } else {
      console.log(`  ❌ ERROR: ${shareLinks.length - uniqueShareLinks.size} duplicados encontrados`);
    }
    console.log();

    // 4. Validar FK: businesses.userId → users.id
    console.log('🔗 VALIDACIÓN DE FOREIGN KEY: businesses.userId → users.id:');
    const userIds = new Set(db.users.map(u => u.id));
    let fkErrors = 0;
    db.businesses.forEach(business => {
      if (!userIds.has(business.userId)) {
        console.log(`  ❌ Business "${business.name}" (${business.id}) referencia user inválido: ${business.userId}`);
        fkErrors++;
      }
    });
    if (fkErrors === 0) {
      console.log(`  ✓ Todas las ${db.businesses.length} referencias son válidas`);
    } else {
      console.log(`  ❌ ${fkErrors} errores de FK encontrados`);
    }
    console.log();

    // 5. Validar FK: reviews.businessId → businesses.id
    console.log('🔗 VALIDACIÓN DE FOREIGN KEY: reviews.businessId → businesses.id:');
    const businessIds = new Set(db.businesses.map(b => b.id));
    fkErrors = 0;
    db.reviews.forEach(review => {
      if (!businessIds.has(review.businessId)) {
        console.log(`  ❌ Review "${review.author}" (${review.id}) referencia business inválido: ${review.businessId}`);
        fkErrors++;
      }
    });
    if (fkErrors === 0) {
      console.log(`  ✓ Todas las ${db.reviews.length} referencias son válidas`);
    } else {
      console.log(`  ❌ ${fkErrors} errores de FK encontrados`);
    }
    console.log();

    // 6. Resumen
    console.log('╔════════════════════════════════════════════════════════════╗');
    const allValid = emails.length === uniqueEmails.size &&
                     shareLinks.length === uniqueShareLinks.size &&
                     db.businesses.every(b => userIds.has(b.userId)) &&
                     db.reviews.every(r => businessIds.has(r.businessId));

    if (allValid) {
      console.log('║  ✅ INTEGRIDAD VALIDADA - DATOS LISTOS PARA MIGRACIÓN    ║');
    } else {
      console.log('║  ❌ ERRORES ENCONTRADOS - NO CONTINUAR MIGRACIÓN          ║');
    }
    console.log('╚════════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('❌ Error durante validación:', error.message);
    process.exit(1);
  }
}

validateData();
