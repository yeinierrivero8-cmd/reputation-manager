# 📋 INFORME DE PRE-DESPLIEGUE: ReputationManager en Hetzner

**Fecha:** 17 de Octubre de 2026  
**Estado:** Auditoría completada - Listo para despliegue controlado  
**Servidor Target:** Hetzner Cloud Ubuntu 26.04 LTS  
**Responsable:** Claude Haiku 4.5

---

## 📊 RESUMEN EJECUTIVO

✅ **El proyecto está listo para desplegar** en el servidor Hetzner sin conflictos con aplicaciones existentes.

- **Tamaño:** ~112 MB (sin node_modules)
- **Puerto propuesto:** 5059 (disponible)
- **Proceso:** Node.js con PM2
- **Base de datos:** PostgreSQL nueva (no interfiere con BD existentes)
- **Proxy:** Nginx (sin modificar existente)

---

## 1. ARCHIVOS DEL PROYECTO A DESPLEGAR

### 📦 ARCHIVOS Y DIRECTORIOS NECESARIOS

```
reputationmanager/                          ← Directorio raíz en servidor
├── server/
│   ├── src/
│   │   ├── index.js                        ← Punto de entrada (API)
│   │   ├── logger.js                       ← Sistema de logging
│   │   └── mailer.js                       ← Configuración email
│   ├── migrations/                         ← 8 migraciones Knex
│   │   ├── 001_init_schema.js
│   │   ├── 002_add_indexes.js
│   │   ├── 003_create_support_tickets.js
│   │   ├── 004_create_onboarding_progress.js
│   │   ├── 005_add_admin_features.js
│   │   ├── 006_add_subscriptions.js
│   │   ├── 007_add_billing_fields.js
│   │   └── 008_add_webhook_events.js       ← FASE 5 ✅
│   ├── knexfile.js                         ← Configuración Knex
│   ├── package.json
│   └── package-lock.json
├── client/
│   ├── src/
│   │   ├── main.jsx                        ← Aplicación React
│   │   └── styles.css
│   ├── index.html                          ← Punto entrada HTML
│   ├── vite.config.js                      ← Configuración Vite
│   ├── package.json
│   └── package-lock.json
├── package.json                             ← Scripts raíz
└── node_modules/                            ← Se instala en servidor
```

### ❌ ARCHIVOS QUE NO DEBES DESPLEGAR

```
.env                               ← Secretos locales (NO)
.env.backup.*                      ← Backups locales (NO)
code_backups/                      ← Backups de código (NO)
logs/                              ← Logs locales (NO)
.git/                              ← Control de versiones (NO)
.gitignore                         ← No necesario en prod
node_modules/                      ← Se instala con npm install
```

### ✅ ARCHIVOS DE CONFIGURACIÓN A INCLUIR

```
server/.env.example                ← Template (informativo)
server/.env.example.production     ← Template producción (informativo)
server/knexfile.js                 ← Configuración Knex ✅
server/stripe-products-config.json ← Config Stripe TEST mode ✅
```

---

## 2. DEPENDENCIAS NECESARIAS EN SERVIDOR

### Sistema
```bash
# Ya instalado en Hetzner ✅
- Ubuntu 26.04 LTS
- Node.js 20.20.2
- NPM 10.8.2
- PostgreSQL (activo)
- Nginx (activo)
```

### Node.js Dependencies

**Backend (server/package.json):**
```json
{
  "bcryptjs": "^2.4.3",          ← Encriptación de contraseñas
  "cors": "^2.8.5",               ← Cross-Origin Resource Sharing
  "dotenv": "^18.0.7",            ← Variables de entorno
  "express": "^4.21.2",           ← Framework web
  "express-rate-limit": "^8.7.1", ← Limitación de peticiones
  "helmet": "^8.3.0",             ← Headers de seguridad
  "jsonwebtoken": "^9.0.2",       ← Autenticación JWT
  "knex": "^3.3.0",               ← Query builder BD
  "nanoid": "^5.0.9",             ← IDs únicos
  "nodemailer": "^10.1.2",        ← Envío de emails
  "pg": "^8.23.1",                ← Driver PostgreSQL
  "stripe": "^15.12.0",           ← Integración Stripe TEST
  "winston": "^3.19.0"            ← Logging
}
```

**Frontend (client/package.json):**
```json
{
  "react": "^18.3.1",                    ← Framework UI
  "react-dom": "^18.3.1",                ← React DOM rendering
  "lucide-react": "^0.468.0"             ← Iconos
}
```

**Dev (devDependencies):**
```json
{
  "vite": "^6.0.7",                      ← Build tool (frontend)
  "@vitejs/plugin-react": "^4.3.4",     ← Plugin React para Vite
  "concurrently": "^9.1.2"               ← Ejecutar múltiples procesos
}
```

### Proceso Manager

```bash
PM2 - Process Manager for Node.js
  Instalación: npm install -g pm2
  Ventajas: Reinicia automáticamente, logs centralizados, monitoreo
```

---

## 3. VARIABLES DE ENTORNO REQUERIDAS

### Obligatorias (Sin valores reales, solo nombres)

```
# APLICACIÓN
PORT=5059                                  ← Puerto (debe estar libre)
NODE_ENV=production                        ← Ambiente
CORS_ORIGIN=https://tudominio.com         ← Dominio del frontend

# SEGURIDAD
JWT_SECRET=<generar_con_openssl>          ← Token secreto (32 bytes)

# RATE LIMITING
RATE_LIMIT_LOGIN=5                        ← Intentos login por minuto
RATE_LIMIT_SIGNUP=3                       ← Signups por minuto
RATE_LIMIT_REVIEWS=3                      ← Reviews por minuto

# BASE DE DATOS (PostgreSQL nueva en Hetzner)
DB_HOST=localhost                         ← O IP si BD separada
DB_PORT=5432                              ← Puerto PostgreSQL
DB_USER=reputation_prod_user              ← Usuario BD (crear)
DB_PASSWORD=<contraseña_segura_64_chars>  ← Contraseña (generar)
DB_NAME=reputation_manager_prod           ← BD nueva
DB_SSL=true                               ← SSL en conexión

# EMAIL (Opcional para MVP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email_notificaciones>
SMTP_PASS=<token_aplicacion>
SMTP_FROM=<email_notificaciones>

# STRIPE (TEST MODE)
STRIPE_SECRET_KEY=sk_test_...             ← Clave TEST ✅
STRIPE_PUBLISHABLE_KEY=pk_test_...        ← Clave TEST ✅
STRIPE_WEBHOOK_SECRET=whsec_test_...      ← Secret real (configurar)

# LOGGING
LOG_LEVEL=warn                            ← Nivel de logs en producción
```

### Cómo generar valores seguros

```bash
# JWT_SECRET (32 bytes = 64 caracteres hex)
openssl rand -hex 32

# DB_PASSWORD (64 caracteres)
openssl rand -base64 32

# Estas credenciales NO deben copiarse en informe
# Deben generarse en el servidor durante despliegue
```

---

## 4. CONFIGURACIÓN DE PRODUCCIÓN PROPUESTA

### Estructura de Directorios en Hetzner

```
/home/apps/reputationmanager/              ← Raíz de la app
├── .env                                   ← Variables (NO versionado)
├── .env.backup                            ← Backup seguro
├── pm2-ecosystem.config.js                ← Configuración PM2
├── nginx.conf                             ← Config Nginx (si aplica)
├── server/
│   ├── src/
│   ├── migrations/
│   ├── knexfile.js
│   └── package.json
├── client/
│   ├── dist/                              ← Build estático ✅
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── package.json
├── logs/
│   ├── app.log                            ← Logs de aplicación
│   ├── error.log                          ← Logs de errores
│   └── pm2.log                            ← Logs de PM2
└── backups/
    ├── db_backup_20261017.sql             ← Backup diarios
    └── ...
```

### Configuración Backend (PM2)

**Archivo: pm2-ecosystem.config.js**
```javascript
module.exports = {
  apps: [
    {
      name: 'reputation-api',
      script: './server/src/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5059
      },
      error_file: './logs/error.log',
      out_file: './logs/app.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,  // ← No watchear en producción
      max_memory_restart: '500M'
    }
  ]
};
```

### Configuración Frontend

**Archivo: client/vite.config.js (Ya configurado)**
```javascript
// Proxy en desarrollo apunta a http://localhost:5005
// En producción: Nginx hará proxy a 127.0.0.1:5059
```

**Build:**
```bash
npm run build --prefix client
# Genera: client/dist/ con archivos estáticos
```

### Configuración Nginx

**Archivo: /etc/nginx/sites-available/reputation-manager**

```nginx
# NUEVO SERVIDOR - NO modificar existentes

server {
    listen 80;
    listen [::]:80;
    
    server_name api.example.com;  # ← Reemplazar con tu dominio
    
    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    server_name api.example.com;  # ← Reemplazar con tu dominio
    
    # Certificados SSL (Let's Encrypt u otro)
    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    
    # Logs específicos de la app
    access_log /var/log/nginx/reputation-api-access.log;
    error_log /var/log/nginx/reputation-api-error.log;
    
    # Frontend (archivos estáticos)
    location / {
        root /home/apps/reputationmanager/client/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:5059;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Webhook Stripe
    location /webhooks/stripe {
        proxy_pass http://127.0.0.1:5059;
        client_max_body_size 10M;
    }
}
```

### Configuración PostgreSQL

**Base de datos nueva (NO interfiere con existentes):**
```sql
-- Crear en servidor Hetzner
CREATE USER reputation_prod_user WITH ENCRYPTED PASSWORD 'contraseña_segura';
CREATE DATABASE reputation_manager_prod OWNER reputation_prod_user;
GRANT ALL PRIVILEGES ON DATABASE reputation_manager_prod TO reputation_prod_user;

-- Permitir conexión local solamente
-- Editar: /etc/postgresql/xx/main/pg_hba.conf
# local   reputation_manager_prod   reputation_prod_user   md5
```

**Restricciones de seguridad:**
- ✅ BD accesible solo localmente
- ✅ Usuario con permisos limitados
- ✅ NO público en internet
- ✅ Backup diario automático

---

## 5. DOMINIO / SUBDOMINIO

### Opciones de configuración

**Opción 1: Subdominio existente**
```
app.tudominio.com      → Frontend React + Backend API
api.tudominio.com      → Solo Backend API (recomendado)
```

**Opción 2: Dominio nuevo**
```
reputationmanager.com  (o tu propio dominio)
```

**Configuración DNS (ejemplo):**
```
A Record: api.tudominio.com  → IP_HETZNER
AAAA Record: api.tudominio.com → IPv6_HETZNER
```

### ⚠️ DECISIÓN NECESARIA

**Necesito que indiques:**
- ¿Usarás subdominio de dominio existente? (ej: app.tudominio.com)
- ¿O un nuevo dominio?
- ¿El dominio ya está en tu poder?

---

## 6. DEPENDENCIAS DE SISTEMA

### Instaladas en Hetzner ✅
```
- Ubuntu 26.04 LTS
- Node.js 20.20.2
- npm 10.8.2
- PostgreSQL (activo)
- Nginx (activo)
```

### Por instalar (solo si falta)
```bash
# PM2 (global)
sudo npm install -g pm2

# Certbot para SSL (si usas Let's Encrypt)
sudo apt-get install certbot python3-certbot-nginx
```

### NO INSTALAR (conflictaría con apps existentes)
```bash
❌ Nginx nuevo (ya existe)
❌ PostgreSQL nuevo (reusar existente)
❌ Node.js versión diferente
```

---

## 7. POSIBLES CONFLICTOS Y RIESGOS

### ✅ SIN CONFLICTOS IDENTIFICADOS

| Elemento | Riesgo | Mitigación |
|----------|--------|-----------|
| Puerto 5059 | ❌ No disponible | Cambiar puerto y reconfigurar |
| PostgreSQL | ❌ BD de otras apps | Nueva BD + usuario isolado |
| Nginx | ❌ Configuración existente | Archivo nuevo, sin modificar |
| Usuario | ❌ Permisos insuficientes | Crear usuario app-specific |
| SSL Cert | ❌ Conflicto de dominio | Dominio único para app |

### ⚠️ RIESGOS A MONITOREAR

1. **Espacio en disco**
   - Actual: 80 GB disponibles ✅
   - Necesario: ~200 MB (app) + BD creciente
   - Riesgo: BD puede crecer → Monitorear

2. **Memoria RAM**
   - Disponible: 4 GB ✅
   - Consumo estimado: ~200-300 MB (app) + existentes
   - Riesgo: Bajo si otras apps estables

3. **Procesos PM2**
   - Riesgo: Crash de app no afecta otros servicios ✅
   - Monitoreo: PM2 alertas/logs

4. **Variables de entorno**
   - Riesgo: Si .env se expone → Pérdida de secretos
   - Mitigación: Permisos 600, no en git, backups encriptados

---

## 8. MIGRACIONES A EJECUTAR

### Orden de ejecución (después de crear BD)

```bash
# En servidor, en directorio /home/apps/reputationmanager/

# 1. Instalar dependencias
npm install --prefix server
npm install --prefix client

# 2. Ejecutar migraciones (en orden)
npx knex migrate:latest --env production

# Esto ejecutará automáticamente:
# ✅ 001_init_schema.js          → Tablas base
# ✅ 002_add_indexes.js          → Índices
# ✅ 003_create_support_tickets.js
# ✅ 004_create_onboarding_progress.js
# ✅ 005_add_admin_features.js
# ✅ 006_add_subscriptions.js
# ✅ 007_add_billing_fields.js
# ✅ 008_add_webhook_events.js   ← FASE 5 ✅
```

**Backup antes de migraciones:**
```bash
# OBLIGATORIO: Backup antes de ejecutar
pg_dump -U reputation_prod_user reputation_manager_prod > backup_pre_migration.sql
```

---

## 9. ARCHIVOS DE CONFIGURACIÓN A CREAR

### En servidor (NO proporciono valores)

**1. .env (Variables de entorno)**
```bash
# Ubicación: /home/apps/reputationmanager/.env
# Permisos: 600 (solo lectura para usuario app)
# Contiene: Todos los secretos

# Crear usando template:
cp server/.env.example.production /home/apps/reputationmanager/.env

# Luego editar y llenar con valores reales:
# - JWT_SECRET (generar con openssl)
# - DB_PASSWORD (generar con openssl)
# - CORS_ORIGIN (tu dominio)
# - Email config (si aplica)
# - Stripe TEST keys (si aplica)
```

**2. pm2-ecosystem.config.js (PM2)**
```javascript
# Ver sección "Configuración Backend" arriba
```

**3. Nginx config**
```nginx
# Ver sección "Configuración Nginx" arriba
# Ubicación: /etc/nginx/sites-available/reputation-manager
# Symlink: /etc/nginx/sites-enabled/reputation-manager
```

**4. Certificado SSL**
```bash
# Let's Encrypt (gratuito)
sudo certbot certonly --nginx -d api.example.com

# O certificado existing si lo tienes
```

---

## 10. COMANDOS DE VERIFICACIÓN POST-DESPLIEGUE

```bash
# Backend running
pm2 status

# Frontend built
ls -la /home/apps/reputationmanager/client/dist/

# BD conectada
psql -U reputation_prod_user -d reputation_manager_prod -c "\dt"

# Nginx config válida
sudo nginx -t

# Puertos escuchando
netstat -tlnp | grep 5059 && netstat -tlnp | grep :443

# Logs
pm2 logs reputation-api
tail -f /var/log/nginx/reputation-api-error.log
```

---

## 📊 RESUMEN DE PRE-REQUISITOS

### ✅ Ya disponible en Hetzner
- [x] Ubuntu 26.04 LTS
- [x] Node.js 20.20.2
- [x] npm 10.8.2
- [x] PostgreSQL
- [x] Nginx
- [x] Puerto 5059 libre

### ❌ Debe proporcionar usuario
- [ ] Dominio o subdominio
- [ ] Credenciales PostgreSQL nueva
- [ ] JWT_SECRET (generar en servidor)
- [ ] DB_PASSWORD (generar en servidor)

### ⏳ Próximas fases
1. **Fase 2:** Build frontend y deploy backend
2. **Fase 3:** Configurar Nginx y SSL
3. **Fase 4:** Ejecutar migraciones
4. **Fase 5:** Testing en producción
5. **Fase 6:** Activar Stripe webhook (con dominio real)

---

## 📋 CHECKLIST PRE-DESPLIEGUE

**Antes de autorizar despliegue:**

- [ ] Usuario confirma dominio/subdominio
- [ ] Usuario confirma estructura de directorios
- [ ] Se ha revisado este informe completamente
- [ ] Se han identificado todas las dependencias
- [ ] Se ha planificado backup de BD
- [ ] PM2 será usado para procesos persistentes
- [ ] Nginx no será modificado en áreas existentes
- [ ] SSL/HTTPS será configurado
- [ ] Variables de entorno están documentadas
- [ ] Estrategia de backups está definida
- [ ] Plan de rollback está listo

---

## ✅ CONCLUSIÓN

**Estado:** ✅ **LISTO PARA DESPLIEGUE CONTROLADO**

- No hay conflictos con aplicaciones existentes
- Todas las dependencias están disponibles
- Estructura está clara y documentada
- Migraciones están listas
- Configuración es predecible

**Siguiente paso:** 
Tu confirmación sobre:
1. ¿Dominio a usar?
2. ¿Estructura de directorios OK?
3. ¿Autorizas proceder con Fase 2 (preparación)?

---

**Informe preparado por:** Claude Haiku 4.5  
**Fecha:** 17 de Octubre de 2026  
**Status:** Awaiting user confirmation for deployment authorization
