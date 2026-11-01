# Procedimiento de Restauración — PostgreSQL (ReputationManager)

**Documento de Operaciones**  
**Fecha:** 2026-10-13  
**Clasificación:** Operacional (Confidencial)

---

## ⚠️ PRECAUCIONES CRÍTICAS

**ANTES de ejecutar restauración:**

1. **Verificar backup es válido:**
   ```bash
   ls -lh server/backups/reputation-manager-*.sql
   # Archivo debe estar > 1KB
   ```

2. **Crear backup de seguridad de la BD actual:**
   ```bash
   pg_dump -h localhost -p 5433 -U postgres reputation_manager_dev > emergency-backup-$(date +%s).sql
   ```

3. **NUNCA ejecutar en producción sin prueba previa** en entorno de staging

4. **Notificar a usuarios** antes de restauración (sesiones se perderán)

---

## Verificar Backup Disponible

```bash
cd server/backups
ls -lh reputation-manager-*.sql
```

**Resultado esperado:**
```
-rw-r--r-- 1 user group 5.6K Oct 13 02:00 reputation-manager-2026-10-13T02-00-00.sql
```

---

## Método 1: Restaurar en BD de Prueba (RECOMENDADO PRIMERO)

### Paso 1: Conectar a PostgreSQL

```bash
psql -h localhost -p 5433 -U postgres
```

**Prompt esperado:**
```
postgres=#
```

### Paso 2: Crear base de datos de prueba

```sql
CREATE DATABASE reputation_manager_test;
```

**Salida esperada:**
```
CREATE DATABASE
```

### Paso 3: Restaurar desde backup a BD de prueba

```bash
# Salir de psql primero (Ctrl+D o \q)
exit
```

```bash
# Ahora restaurar
psql -h localhost -p 5433 -U postgres reputation_manager_test < server/backups/reputation-manager-2026-10-13T02-00-00.sql
```

**Esperar a que termine** (puede tomar 5-30 segundos)

**Salida esperada:**
```
SET
SET
SET
...
CREATE TABLE
CREATE INDEX
...
```

### Paso 4: Verificar restauración fue exitosa

```bash
psql -h localhost -p 5433 -U postgres -d reputation_manager_test
```

```sql
-- Verificar tablas existen
\dt

-- Resultado esperado:
-- public | businesses | table | postgres
-- public | reviews    | table | postgres
-- public | users      | table | postgres
```

```sql
-- Verificar registros
SELECT 
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM businesses) as businesses_count,
  (SELECT COUNT(*) FROM reviews) as reviews_count;
```

**Resultado esperado:**
```
 users_count | businesses_count | reviews_count
-------------+------------------+---------------
           8 |                8 |             9
(1 row)
```

### Paso 5: Verificar integridad referencial

```sql
-- Buscar orfandades (relaciones rotas)
SELECT 'Businesses without user' as issue, COUNT(*) 
FROM businesses b 
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = b."userId");

SELECT 'Reviews without business' as issue, COUNT(*) 
FROM reviews r 
WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = r."businessId");
```

**Resultado esperado:**
```
 issue | count
-------+-------
       |     0
(1 row)
```

### Paso 6: Limpiar BD de prueba si la restauración fue exitosa

```bash
psql -h localhost -p 5433 -U postgres -c "DROP DATABASE reputation_manager_test;"
```

✅ **Si llegaste aquí, el backup es válido y restaurable**

---

## Método 2: Restaurar en BD de Producción (DESPUÉS DE VERIFICAR)

**⚠️ SOLO ejecutar si:**
- ✅ Método 1 (prueba) fue exitoso
- ✅ Backup es más reciente que la corrupción detectada
- ✅ Usuarios fueron notificados
- ✅ Backup de emergencia fue creado (ver abajo)

### Paso 1: Crear backup de emergencia de BD actual

```bash
pg_dump -h localhost -p 5433 -U postgres reputation_manager_dev > emergency-backup-before-restore-$(date +%s).sql
```

**Guardar este archivo en lugar seguro.**

### Paso 2: Restaurar directamente en BD de producción

```bash
# Opción A: Restaurar con psql (más lento, más seguro)
psql -h localhost -p 5433 -U postgres reputation_manager_dev < server/backups/reputation-manager-YYYYMMDD-HHMMSS.sql

# Opción B: Restaurar con pg_restore (más rápido, requiere formato dump)
# (Solo si backup fue creado con pg_dump -Fc)
# pg_restore -h localhost -p 5433 -U postgres -d reputation_manager_dev backup.dump
```

**Esperar a que termine completamente** (puede tomar 1-5 minutos)

### Paso 3: Verificar restauración exitosa

```bash
psql -h localhost -p 5433 -U postgres -d reputation_manager_dev -c "
SELECT 
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM businesses) as businesses_count,
  (SELECT COUNT(*) FROM reviews) as reviews_count;
"
```

**Comparar con números de Paso 5 (Método 1)**

### Paso 4: Reiniciar aplicación

```bash
# Desarrollo
Ctrl+C (detener npm run dev)
npm run dev

# Producción
systemctl restart reputation-manager
# o: docker restart reputation-manager
```

### Paso 5: Verificar aplicación funciona

```bash
# Health check
curl http://localhost:5000/api/health

# Respuesta esperada:
# {"ok":true,"name":"ReputationManager API"}
```

### Paso 6: Test de login

```bash
# Usar credenciales de usuario conocido
# Verificar en navegador: http://localhost:5000 (o tu dominio)
# 1. Logout de sesión anterior
# 2. Login con usuario conocido
# 3. Verificar datos (negocios, reseñas) están presentes
```

---

## Escenario: Restauración Fallida

Si algo salió mal durante restauración:

### Opción 1: Volver a BD anterior (desde emergency backup)

```bash
# Restaurar desde archivo de emergencia creado en Paso 1 (Método 2)
psql -h localhost -p 5433 -U postgres reputation_manager_dev < emergency-backup-before-restore-TIMESTAMP.sql
```

### Opción 2: Usar código backup de aplicación

Si BD está completamente corrupta:

```bash
# Dropear BD corrupta
psql -h localhost -p 5433 -U postgres -c "DROP DATABASE reputation_manager_dev;"

# Recrear BD vacía
psql -h localhost -p 5433 -U postgres -c "CREATE DATABASE reputation_manager_dev;"

# Ejecutar migraciones de código
cd server
npm run migrate  # o: npx knex migrate:latest
```

---

## Automatización: Tarea Programada (Futuro)

**NO IMPLEMENTADO AÚN** — Será configurado en ETAPA B

Para futuro, cuando decidas automatizar backups:

### Linux/macOS (Cron)

```bash
# Editar crontab
crontab -e

# Agregar línea (backup diario a las 2am)
0 2 * * * cd /path/to/server && npm run backup:db

# Verificar instalado
crontab -l
```

### Windows (Task Scheduler)

1. Crear archivo `backup-cron.bat`:
```batch
@echo off
cd C:\path\to\ReputationManager_FromScratch\server
call npm run backup:db
```

2. Crear tarea en Task Scheduler:
   - Nombre: "ReputationManager Backup"
   - Acción: Ejecutar `backup-cron.bat`
   - Horario: Diario a las 2:00 AM
   - Usuario: (cuenta que corre PostgreSQL)

---

## Política de Retención de Backups

- **Mantener:** Últimos 7 días (automático)
- **Probar:** Uno cada semana (manual)
- **Archivar:** Copiar a S3/Azure/Drive cada mes (manual)
- **Eliminar:** Backups > 30 días (manual)

---

## Comandos de Referencia Rápida

```bash
# Ver backups disponibles
ls -lah server/backups/

# Crear backup manual
npm run backup:db

# Conectar a PostgreSQL
psql -h localhost -p 5433 -U postgres -d reputation_manager_dev

# Ver estructura de BD
psql -h localhost -p 5433 -U postgres -d reputation_manager_dev -c "\dt"

# Contar registros por tabla
psql -h localhost -p 5433 -U postgres -d reputation_manager_dev -c "
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'businesses', COUNT(*) FROM businesses
UNION ALL
SELECT 'reviews', COUNT(*) FROM reviews;
"

# Ver tamaño de BD
psql -h localhost -p 5433 -U postgres -c "
SELECT pg_size_pretty(pg_database_size('reputation_manager_dev')) as db_size;
"
```

---

## Checklist Pre-Restauración

```
Preparación:
  [ ] Backup a restaurar verificado (existe y > 1KB)
  [ ] Backup de emergencia creado (BD actual)
  [ ] Usuarios notificados (si restauración en producción)
  [ ] Tiempo planeado (fuera de horario pico)
  [ ] Acceso a psql/PostgreSQL confirmado

Ejecución:
  [ ] Restauración en BD de prueba completada exitosamente
  [ ] Integridad referencial verificada
  [ ] Conteos de registros coinciden

Post-Restauración:
  [ ] Aplicación restartó sin errores
  [ ] Health check retorna {"ok":true}
  [ ] Login de usuario conocido funciona
  [ ] Datos (negocios, reseñas) presentes y correctos
```

---

## Contacto de Soporte

- **Problema:** Restauración fallida
- **Contactar:** DevOps / Database Administrator
- **Información a proporcionar:**
  - Error exacto de psql/pg_restore
  - Timestamp del backup usado
  - Archivo de emergencia backup creado sí/no
  - Últimas acciones en BD antes del problema

