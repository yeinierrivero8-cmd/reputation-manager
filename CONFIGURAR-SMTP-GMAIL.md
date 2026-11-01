# 📧 GUÍA: CONFIGURAR NOTIFICACIONES POR CORREO - GMAIL SMTP

**Estado Actual:** ❌ SMTP no configurado (correos no se envían)  
**Objetivo:** ✅ Activar notificaciones automáticas a través de Gmail

---

## 📋 RESUMEN

El sistema ReputationManager está **listo para enviar correos automáticos**, pero necesita que actives:

1. **Autenticación de dos factores** en tu cuenta de Google
2. **Contraseña de aplicación** de Google
3. **Variables SMTP** en `server/.env`
4. **Reinicio del backend**

Una vez hecho, las notificaciones funcionarán automáticamente:
- ✅ Admin recibe aviso cuando llega un ticket
- ✅ Cliente recibe respuestas por correo

---

## ⚙️ PASO 1: ACTIVAR AUTENTICACIÓN DE DOS FACTORES

Esto es REQUERIDO por Google para generar contraseñas de aplicación.

### En tu navegador:

1. Ve a: https://myaccount.google.com
2. En el menú izquierdo: **Seguridad**
3. Busca: **Verificación de dos pasos** (Two-Step Verification)
4. Haz clic: **Activar**
5. Sigue los pasos de Google (teléfono, código, etc.)

> **Nota:** Si ya tienes 2FA activado, continúa al Paso 2.

---

## 🔐 PASO 2: GENERAR CONTRASEÑA DE APLICACIÓN

### En tu navegador:

1. Ve a: https://myaccount.google.com
2. En el menú izquierdo: **Seguridad**
3. Busca: **Contraseñas de aplicación** (App passwords)
4. Sistema operativo: **Windows**
5. Tipo de dispositivo: **Otros (custom name)**
6. Nombre personalizado: `ReputationManager SMTP`
7. Haz clic: **Generar**

### Google te mostrará una contraseña de 16 caracteres:

```
xxxx xxxx xxxx xxxx
```

> ⚠️ **IMPORTANTE:**
> - Esta contraseña solo aparece UNA VEZ
> - Cópiala y guárdala de forma segura
> - NO es tu contraseña de Google
> - Es solo para esta aplicación

---

## 🔧 PASO 3: CONFIGURAR VARIABLES EN server/.env

Abre el archivo: **`server/.env`**

Busca la sección:
```
# SMTP Configuration (Email Notifications)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

**Reemplázalas con:**

```env
# SMTP Configuration (Email Notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=yeinierrivero8@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM=yeinierrivero8@gmail.com
```

**Notas:**
- `SMTP_PASS`: Pega la contraseña de aplicación que Google generó (16 caracteres, con espacios)
- `SMTP_USER`: Tu correo de Gmail completo
- `SMTP_FROM`: El correo que aparecerá en el "De:" de los emails
- `SMTP_PORT`: 587 es para TLS (recomendado), NO cambies a 465

### Ejemplo completo con datos reales:

```env
PORT=5005
JWT_SECRET=9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:5175,http://localhost:3000

DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=Lastunas1
DB_NAME=reputation_manager_dev
DB_SSL=false

# Support System Configuration
SUPPORT_EMAIL=yeinierrivero8@gmail.com
SUPPORT_PHONE=7866020720

# SMTP Configuration - GMAIL
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=yeinierrivero8@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
SMTP_FROM=yeinierrivero8@gmail.com
```

---

## 🚀 PASO 4: REINICIAR EL BACKEND

Después de guardar el `.env`, reinicia el servidor:

### Terminal 1 (Backend):

```bash
cd server
npm run dev
```

Deberías ver en los logs:
```
✓ Mailer initialized successfully
```

Si ves error, revisa:
- ¿Copié bien SMTP_PASS? (16 caracteres)
- ¿Está SMTP_HOST=smtp.gmail.com?
- ¿Está SMTP_USER=tu_correo@gmail.com?

---

## ✅ PASO 5: VERIFICAR CONEXIÓN SMTP

Una vez reiniciado el backend, ejecuta este test:

```bash
cd server
node << 'EOF'
import pg from 'pg';
import fetch from 'node-fetch';

const db = new pg.Client({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: 'Lastunas1',
  database: 'reputation_manager_dev'
});

async function test() {
  console.log('\n🧪 VERIFICANDO CONEXIÓN SMTP...\n');
  
  try {
    const response = await fetch('http://localhost:5005/api/support/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Prueba SMTP Gmail',
        email: 'prueba@test.local',
        subject: 'Verificar SMTP configurado',
        message: 'Este es un correo de prueba para verificar que SMTP está funcionando correctamente.'
      })
    });
    
    const data = await response.json();
    
    console.log('✓ Ticket creado');
    console.log(`  Estado email: ${data.emailNotification}`);
    
    if (data.emailNotification === 'sent') {
      console.log('✅ CORREO ENVIADO - Revisa tu bandeja de entrada');
      console.log('   (Puede estar en carpeta "Promotions" o "Other")');
    } else if (data.emailNotification === 'not_configured') {
      console.log('❌ SMTP aún no está configurado');
      console.log('   Revisa que SMTP_PASS esté en server/.env');
    } else {
      console.log(`   Estado: ${data.emailNotification}`);
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

test().catch(console.error);
EOF
```

---

## 🎯 QUÉ OCURRE CUANDO SMTP ESTÁ CONFIGURADO

### 1. Cliente envía un ticket:

```
Cliente → Formulario → Ticket guardado en BD
                    ↓
              CORREO AL ADMIN
```

**Admin recibe:**
```
De: ReputationManager <noreply@...>
Para: yeinierrivero8@gmail.com
Asunto: [Nuevo Ticket] Tengo una pregunta

Nuevo Ticket de Soporte
Número de Seguimiento: ABC123XYZ456
De: Cliente (cliente@example.com)
Asunto: Tengo una pregunta
Mensaje: ...
```

### 2. Admin responde:

```
Admin escribe respuesta → Guardada en BD
                       ↓
                  CORREO AL CLIENTE
```

**Cliente recibe:**
```
De: ReputationManager <noreply@...>
Para: cliente@example.com
Asunto: Re: Tengo una pregunta

Respuesta a Tu Solicitud de Soporte

Hola Cliente,

Hemos recibido tu solicitud...
[Respuesta del admin]
```

---

## 📊 DIFERENCIA CON/SIN SMTP

| Situación | Sin SMTP | Con SMTP |
|-----------|----------|----------|
| Cliente envía ticket | ✅ Se guarda | ✅ Se guarda + 📧 Email al admin |
| Admin responde | ✅ Se guarda | ✅ Se guarda + 📧 Email al cliente |
| Admin ve tickets | ✅ Panel admin | ✅ Panel admin |
| Cliente notificado | ❌ No | ✅ Sí, por correo |
| Admin notificado | ❌ No | ✅ Sí, por correo |

---

## 🔍 VERIFICAR LOGS

Si hay problemas, revisa los logs del backend:

```bash
# Los logs muestran si SMTP se inicializó
tail -f server/logs/*.log | grep -i smtp
```

Deberías ver algo como:
```
2026-10-16 22:35:10 [INFO] Mailer initialized successfully
2026-10-16 22:40:25 [INFO] Admin notification sent {ticketId: "ABC123"}
2026-10-16 22:41:10 [INFO] Client response sent {ticketId: "ABC123"}
```

Si ves errores:
```
[ERROR] Mailer initialization failed {error: "Invalid credentials"}
```

Revisa:
- SMTP_PASS está correctamente copiado
- 2FA está habilitado en Google
- No usaste tu contraseña personal de Gmail

---

## ⚠️ SOLUCIÓN DE PROBLEMAS

### Problema: "Invalid credentials"

**Soluciones:**
1. Verifica SMTP_PASS está bien copiado (16 caracteres con espacios)
2. Revisa que 2FA esté activado en Google
3. Genera una contraseña de aplicación NUEVA
4. Limpia espacios en blanco extras

### Problema: "Connection timeout"

**Soluciones:**
1. Verifica `SMTP_HOST=smtp.gmail.com`
2. Verifica `SMTP_PORT=587`
3. Revisa que internet está activo
4. Algunos firewalls bloquean puerto 587 (intenta 465 con SMTP_SECURE=true)

### Problema: "No recibí el correo"

**Soluciones:**
1. Revisa carpeta Promotions, Spam, Other
2. Verifica SUPPORT_EMAIL está bien en .env
3. Revisa los logs del backend para ver si se envió
4. Intenta con un correo diferente

### Problema: "Todavía dice 'not_configured'"

**Soluciones:**
1. Verifica TODAS estas variables en .env:
   - SMTP_HOST
   - SMTP_PORT
   - SMTP_USER
   - SMTP_PASS
   - SMTP_FROM
   - SUPPORT_EMAIL
2. Asegúrate que NO hay espacios al inicio/final
3. Reinicia el backend: `npm run dev`
4. Busca en los logs: `Mailer initialized`

---

## 🔒 SEGURIDAD

**Puntos importantes:**

✅ **Correctamente:**
- Usa contraseña de APLICACIÓN (no personal)
- Guarda SMTP_PASS solo en server/.env
- SMTP_PASS nunca se expone al frontend
- SMTP_PASS nunca aparece en logs

❌ **NUNCA hagas:**
- Usar tu contraseña personal de Google
- Escribir SMTP_PASS en comentarios o documentos
- Publicar SMTP_PASS en GitHub
- Confiar SMTP_PASS al frontend

---

## ✨ EJEMPLO COMPLETO

### Archivo: server/.env

```env
# ... otras variables ...

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=yeinierrivero8@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
SMTP_FROM=yeinierrivero8@gmail.com
SUPPORT_EMAIL=yeinierrivero8@gmail.com
```

### Backend iniciado:

```
$ npm run dev
[INFO] Mailer initialized successfully
[INFO] ReputationManager API running on port 5005
```

### Cliente envía ticket:

```
Ticket #XYZ123 creado
✅ Email enviado al admin
Email notification: sent
```

### Admin recibe correo en bandeja de entrada

---

## 📞 RESUMEN DE CAMBIOS

| Elemento | Cambio |
|----------|--------|
| server/.env | Agregar SMTP_PASS + SMTP_HOST/PORT/USER/FROM |
| server/src/index.js | ✅ YA IMPLEMENTADO - Llama sendAdminNotification() |
| server/src/mailer.js | ✅ YA IMPLEMENTADO - Función de envío |
| Flujo de tickets | ✅ Ahora envía correos automáticos |

---

## 🎉 PRÓXIMA PRUEBA

Una vez hayas configurado SMTP, ejecuta:

```bash
# 1. Crear un ticket de prueba
curl -X POST http://localhost:5005/api/support/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Prueba Final",
    "email": "cliente@prueba.local",
    "subject": "Verificar que SMTP funciona",
    "message": "Si recibes este correo en tu admin, SMTP está configurado correctamente."
  }'

# 2. Revisa tu bandeja de entrada (incluye Promotions/Spam)

# 3. Como admin, responde:
curl -X POST http://localhost:5005/api/admin/tickets/TICKET_ID/response \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"response_text": "Gracias por tu prueba. SMTP está funcionando correctamente."}'

# 4. Cliente debe recibir la respuesta por correo
```

---

**Cuando SMTP esté configurado, dime y haré pruebas reales de envío de correos.**
