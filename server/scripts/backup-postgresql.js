#!/usr/bin/env node

/**
 * PostgreSQL Backup Script for ReputationManager
 *
 * Ejecuta pg_dump para crear backup SQL de la base de datos
 * Mantiene últimos 7 backups, elimina más antiguos automáticamente
 *
 * SEGURIDAD: Contraseña se pasa via PGPASSWORD env var (no en comando)
 *
 * USO:
 *   npm run backup:db
 *
 * CONFIGURACIÓN CRON (Linux/Mac):
 *   crontab -e
 *   0 2 * * * cd /ruta/a/server && npm run backup:db >> /var/log/reputation-backup.log 2>&1
 *
 * CONFIGURACIÓN WINDOWS TASK SCHEDULER:
 *   - Acción: cmd.exe
 *   - Argumentos: /c "cd C:\ruta\a\server && npm run backup:db"
 *   - Horario: Diario 2:00 AM
 */

import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupDir = path.join(__dirname, '../backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupFile = path.join(backupDir, `reputation-manager-${timestamp}.sql`);

// ============================================================
// Validaciones
// ============================================================

// Crear directorio de backups si no existe
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`✅ Backup directory created: ${backupDir}`);
}

// Verificar variables de entorno requeridas
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error('❌ Error: Missing database configuration in .env');
  console.error(`   Required but missing: ${missingVars.join(', ')}`);
  console.error('   Ensure these variables are set: DB_HOST, DB_PORT, DB_USER, DB_NAME, DB_PASSWORD');
  process.exit(1);
}

// ============================================================
// Ejecutar pg_dump
// ============================================================

console.log(`⏳ Starting backup of ${process.env.DB_NAME}...`);
console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
console.log(`   User: ${process.env.DB_USER}`);
console.log(`   Database: ${process.env.DB_NAME}`);
console.log(`   Output: ${path.basename(backupFile)}`);

// Crear stream de escritura para archivo de backup
const writeStream = fs.createWriteStream(backupFile);

// Preparar entorno con contraseña
const env = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD };

// Buscar pg_dump en Windows si no está en PATH
let pgdumpCmd = 'pg_dump';
if (process.platform === 'win32') {
  const possiblePaths = [
    'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
    'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
    'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
    'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\18\\bin\\pg_dump.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\17\\bin\\pg_dump.exe',
  ];

  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      pgdumpCmd = path;
      break;
    }
  }
}

// Ejecutar pg_dump
const pgdump = spawn(pgdumpCmd, [
  '-h', process.env.DB_HOST,
  '-p', process.env.DB_PORT,
  '-U', process.env.DB_USER,
  '-d', process.env.DB_NAME,
  '--format=plain'
], { env, stdio: ['pipe', 'pipe', 'pipe'] });

// Pipe output a archivo
pgdump.stdout.pipe(writeStream);

// Manejo de errores
let errorOutput = '';

pgdump.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

pgdump.on('close', (code) => {
  if (code !== 0) {
    // Error en pg_dump
    console.error('❌ Backup failed with error:');
    console.error('   ' + errorOutput.split('\n').join('\n   '));

    // Eliminar archivo incompleto
    try {
      if (fs.existsSync(backupFile)) {
        fs.unlinkSync(backupFile);
        console.log('   Removed incomplete backup file');
      }
    } catch (e) {
      console.error('   Warning: Could not remove incomplete file');
    }

    process.exit(1);
  }

  // Backup exitoso
  handleBackupSuccess();
});

// Manejo de error en proceso
pgdump.on('error', (err) => {
  console.error('❌ Failed to start pg_dump:');
  console.error('   ' + err.message);
  console.error('   Ensure pg_dump is installed and in PATH');
  process.exit(1);
});

// ============================================================
// Post-Backup
// ============================================================

function handleBackupSuccess() {
  // Verificar que archivo no esté vacío
  const stats = fs.statSync(backupFile);
  if (stats.size === 0) {
    console.error('❌ Backup file is empty - pg_dump produced no output');
    fs.unlinkSync(backupFile);
    process.exit(1);
  }

  // Reporte de éxito
  const sizeKB = (stats.size / 1024).toFixed(2);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log('\n✅ Backup completed successfully');
  console.log(`   File: ${path.basename(backupFile)}`);
  console.log(`   Size: ${sizeKB} KB (${sizeMB} MB)`);
  console.log(`   Location: ${backupDir}`);

  // Limpiar backups antiguos (mantener últimos 7)
  cleanupOldBackups();

  console.log('\n✅ Backup routine completed');
  process.exit(0);
}

function cleanupOldBackups() {
  try {
    // Listar archivos de backup
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('reputation-manager-') && f.endsWith('.sql'))
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Más recientes primero

    // Eliminar archivos más antiguos que el 7º
    if (files.length > 7) {
      console.log(`\n🧹 Cleaning old backups (keeping last 7, found ${files.length}):`);

      const toDelete = files.slice(7);
      toDelete.forEach(file => {
        const filePath = path.join(backupDir, file.name);
        const sizeBefore = fs.statSync(filePath).size;
        fs.unlinkSync(filePath);
        console.log(`   Deleted: ${file.name} (${(sizeBefore / 1024).toFixed(2)} KB)`);
      });

      // Calcular espacio liberado
      const totalFreed = toDelete.reduce((sum, f) => {
        try {
          return sum + fs.statSync(path.join(backupDir, f.name)).size;
        } catch {
          return sum;
        }
      }, 0);

      console.log(`   Space freed: ${(totalFreed / 1024).toFixed(2)} KB`);
    } else {
      console.log(`\n📊 Backup history (${files.length}/7 max):`);
      files.forEach(f => {
        const size = fs.statSync(path.join(backupDir, f.name)).size;
        console.log(`   ${f.name} (${(size / 1024).toFixed(2)} KB)`);
      });
    }
  } catch (e) {
    console.warn('⚠️  Warning: Could not clean old backups');
    console.warn('   Details: ' + e.message);
    // No exitir con error - backup fue exitoso
  }
}
