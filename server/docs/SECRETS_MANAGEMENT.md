# Gestión de Secretos — ReputationManager

**Documento de Seguridad**  
**Fecha:** 2026-10-13  
**Clasificación:** Confidencial

---

## ⚠️ IMPORTANTE

Este documento trata sobre la protección de credenciales críticas. Los secretos nunca deben:
- Ser mostrados en consola o logs
- Ser commiteados a Git
- Ser compartidos por email o chat
- Ser almacenados en texto plano en producción

---

## Secretos Críticos en ReputationManager

### 1. JWT_SECRET

**Propósito:** Firmar y verificar tokens JWT de autenticación

**Ubicación Actual:**
- Desarrollo: `server/.env` variable `JWT_SECRET`
- Producción: Variable de entorno (sin archivo .env)

**Características Requeridas:**
- Mínimo 32 bytes (256 bits de entropía)
- Formato: Hexadecimal o Base64
- Validación: Aplicación verifica en startup (production mode)

**Validación en Startup:**
```
✅ JWT_SECRET presente y >= 32 bytes → Aplicación inicia
❌ JWT_SECRET ausente (production) → Exit code 1
❌ JWT_SECRET < 32 bytes (production) → Exit code 1
⚠️  JWT_SECRET ausente (development) → Warning, con default inseguro
```

**Generación Segura:**
```bash
# Node.js (recomendado)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32

# Output ejemplo (NO COPIAR - es solo ejemplo)
# 9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a
```

**Rotación de JWT_SECRET:**
- Cambiar valor en `.env` (desarrollo) o Secret Manager (producción)
- Reiniciar aplicación
- **Efecto:** Todos los tokens JWT existentes se invalidan
- **Impacto:** Usuarios pierden sesiones (re-login necesario)
- **Recuperación:** Si se comete error, revertir a valor anterior

**Verificación Posterior a Cambio:**
```bash
# Login exitoso con nueva sesión
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"..."}'

# Respuesta: {"token":"eyJ...","user":{...}}
```

---

### 2. DB_PASSWORD

**Propósito:** Autenticación contra base de datos PostgreSQL

**Ubicación Actual:**
- Desarrollo: `server/.env` variable `DB_PASSWORD`
- Producción: Secret Manager (AWS Secrets, Vault, etc.)

**Detalles Técnicos:**
- Usuario de BD: `postgres`
- Base de datos: `reputation_manager_dev`
- Puerto: `5433` (default PostgreSQL es 5432)
- Protocolo: TCP/IP

**Almacenamiento Seguro:**

| Ambiente | Recomendación | Implementación |
|----------|---|---|
| **Desarrollo** | .env local | ✅ Actual (NO en Git) |
| **Staging** | Secret Manager | Pendiente |
| **Producción** | Secret Manager | Pendiente |

**Opciones de Secret Manager:**
- AWS Secrets Manager (para AWS)
- HashiCorp Vault (self-hosted)
- Azure Key Vault (para Azure)
- 1Password Secrets Automation (para equipos)

**Cambio de DB_PASSWORD:**

### En PostgreSQL:
```bash
psql -h localhost -p 5433 -U postgres -c "ALTER USER postgres WITH PASSWORD 'nueva_contraseña';"
```

### En Aplicación:
```bash
# Actualizar server/.env
DB_PASSWORD=nueva_contraseña

# O en production (Secret Manager):
# Actualizar secreto en AWS/Vault/etc

# Reiniciar aplicación
npm run dev  # desarrollo
# systemctl restart reputation-manager  # production
```

**Verificación de Cambio:**
```bash
# Intentar conectar con nueva contraseña
psql -h localhost -p 5433 -U postgres reputation_manager_dev -c "SELECT COUNT(*) FROM users;"
```

---

### 3. Certificados SSL (Producción)

**Propósito:** Encripción HTTPS entre cliente y servidor

**Ubicación Futura:**
- Clave privada: `/etc/ssl/private/reputation-manager.key` (producción)
- Certificado público: `/etc/ssl/certs/reputation-manager.crt` (producción)

**NO está implementado aún** (Riesgo 1, ETAPA A en pausa)

**Generación con Let's Encrypt (cuando aplique):**
```bash
certbot certonly --standalone -d yourdomain.com
```

---

## 📋 Checklist Pre-Producción

Antes de publicar en producción:

```
Seguridad de Secretos:
  [ ] JWT_SECRET generado con 32+ bytes
  [ ] JWT_SECRET != al valor de desarrollo
  [ ] DB_PASSWORD != al valor de desarrollo
  [ ] DB_PASSWORD está en Secret Manager (no en .env)
  [ ] Certificados SSL en Secret Manager
  [ ] .env excluido de Git (.gitignore ✅)

Validación en Startup:
  [ ] Aplicación valida JWT_SECRET >= 32 bytes
  [ ] Aplicación falla si JWT_SECRET ausente (production mode)
  [ ] Logs no muestran valores de secretos
  
Rotación y Recuperación:
  [ ] Procedimiento documentado para rotar JWT_SECRET
  [ ] Procedimiento documentado para rotar DB_PASSWORD
  [ ] Plan de comunicación si secreto se expone
  [ ] Recuperación rápida en caso de cambio accidental

Auditoría:
  [ ] Verificar que archivos .env no están en Git
  [ ] grep -r "JWT_SECRET\|DB_PASSWORD" logs/ (debe estar vacío)
  [ ] Revisar acceso a Secret Manager (audit trail)
```

---

## 🚨 Procedimiento de Emergencia

### Escenario 1: JWT_SECRET se expone

**Indicios:**
- Token forjado detectado
- Sospecha de acceso no autorizado
- Cambio accidental de JWT_SECRET

**Acciones Inmediatas:**
1. Generar nuevo JWT_SECRET:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Actualizar en .env / Secret Manager:
   ```bash
   DB_PASSWORD=nuevo_valor_generado
   ```

3. Reiniciar aplicación:
   ```bash
   npm run dev  # o systemctl restart
   ```

4. **Impacto:** Todos los usuarios pierden sesiones (re-login necesario)

5. **Comunicación:** Notificar usuarios sobre re-login requerido

6. **Auditoría:** Revisar logs de 48h anteriores para acceso sospechoso

---

### Escenario 2: DB_PASSWORD se expone

**Indicios:**
- Cambios no autorizados en base de datos
- Intentos de acceso detectados en logs PostgreSQL
- Sospecha de data breach

**Acciones Inmediatas:**
1. Generar nueva contraseña fuerte (20+ caracteres)

2. Cambiar en PostgreSQL:
   ```bash
   psql -h localhost -p 5433 -U postgres
   ALTER USER postgres WITH PASSWORD 'nueva_contraseña_fuerte';
   ```

3. Actualizar en aplicación:
   ```bash
   # .env (desarrollo) o Secret Manager (producción)
   DB_PASSWORD=nueva_contraseña_fuerte
   ```

4. Reiniciar aplicación

5. **Auditoría:** 
   ```bash
   # Ver últimos cambios en BD
   SELECT query, query_start FROM pg_stat_statements 
   WHERE query NOT LIKE '%pg_stat_statements%' 
   ORDER BY query_start DESC LIMIT 20;
   ```

6. **Backup de emergencia:**
   ```bash
   pg_dump -h localhost -p 5433 -U postgres reputation_manager_dev > emergency-backup-$(date +%s).sql
   ```

---

### Escenario 3: .env accidentalmente commiteado a Git

**Indicios:**
- Archivo .env visible en repositorio público
- Git history contiene secretos

**Acciones Inmediatas:**
1. **Rotación INMEDIATA:**
   - Generar nuevo JWT_SECRET
   - Generar nueva DB_PASSWORD
   - Actualizar en aplicación y servicio

2. **Purgar histórico Git:**
   ```bash
   git log --diff-filter=D --summary | grep delete | grep .env
   git filter-branch --tree-filter 'rm -f server/.env' HEAD
   git push --force --all
   ```

3. **Verificar que .gitignore está correcto:**
   ```bash
   git status server/.env
   # Debe mostrar: "server/.env" (ignored)
   ```

4. **Comunicación:** Notificar a todos los usuarios con acceso al repo

---

## 📞 Contacto de Seguridad

Para reportar problemas de seguridad:
- **Email:** security@reputation-manager.local
- **Respuesta:** En las próximas 24 horas
- **Confidencialidad:** NO publicar en issues públicas

---

## Referencias

- [OWASP: Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [PostgreSQL Authentication](https://www.postgresql.org/docs/current/auth-methods.html)

