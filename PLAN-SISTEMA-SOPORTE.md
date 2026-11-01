# 🎯 PLAN PROFESIONAL - SISTEMA DE SOPORTE COMPLETO
## ReputationManager - Gestión de Tickets con Autenticación y Panel Administrativo

**Fecha de Inicio:** 2026-10-16  
**Enfoque:** Seguro, Modular, Sin Datos Inventados  
**Entorno:** Local (Desarrollo) - No para producción

---

## 📊 ESTADO ACTUAL (FASE 1 - REVISIÓN)

### ✅ Lo que YA existe:

1. **Tabla: `support_tickets`**
   - Campos: id, ticket_id, user_id (nullable), name, email, subject, message, status, email_sent, created_at
   - Estado: Tickets se guardan correctamente
   - Verificado: ✅ Funciona

2. **Endpoint: POST `/api/support/contact`**
   - Valida token JWT (usuario autenticado)
   - Asocia user_id si el usuario está autenticado
   - Genera ticket_id único
   - Fallback graceful sin columna user_id
   - Detecta si SMTP está configurado
   - Estado: Implementado ✅

3. **Frontend: `SupportView`**
   - Autocompletar nombre y email del usuario
   - Permitir editar sin afectar el perfil
   - Mostrar número de seguimiento
   - Estado: Implementado ✅

4. **Variables de entorno existentes:**
   ```env
   PORT=5005
   JWT_SECRET=...
   DB_HOST=localhost
   DB_PORT=5433
   DB_USER=postgres
   DB_PASSWORD=Lastunas1
   DB_NAME=reputation_manager_dev
   CORS_ORIGIN=...
   ```

### ❌ Lo que FALTA:

1. **Variables de entorno para administrador**
   - SUPPORT_EMAIL (correo del administrador)
   - SUPPORT_PHONE (teléfono del administrador)
   - SUPPORT_ADMIN_ID (ID del usuario administrador)
   - SUPPORT_ADMIN_PASSWORD (contraseña para panel admin)

2. **Configuración SMTP**
   - SMTP_HOST
   - SMTP_PORT
   - SMTP_USER
   - SMTP_PASS
   - SMTP_FROM

3. **Tabla: `support_responses`** (para respuestas del admin)
   - Campos necesarios: id, ticket_id, admin_id, response_text, created_at
   - Relación con support_tickets
   - Estado: NO EXISTE ❌

4. **Endpoints de Administrador**
   - GET `/api/admin/tickets` - Listar todos los tickets
   - GET `/api/admin/tickets/:ticketId` - Ver un ticket específico
   - POST `/api/admin/tickets/:ticketId/response` - Responder un ticket
   - PATCH `/api/admin/tickets/:ticketId/status` - Cambiar estado (new, in_progress, resolved)
   - Estado: NO IMPLEMENTADOS ❌

5. **Panel Administrativo (Frontend)**
   - Página de dashboard de tickets
   - Lista de tickets con filtros
   - Visualización de detalles del ticket
   - Formulario de respuesta
   - Historial de conversación
   - Estado: NO IMPLEMENTADO ❌

6. **Envío de Correos**
   - Nodemailer instalado y configurado
   - Plantilla de correo para notificación a admin
   - Plantilla de correo para respuesta a cliente
   - Manejo de errores (no eliminar ticket si falla correo)
   - Estado: NO IMPLEMENTADO ❌

7. **Integración WhatsApp**
   - Botón que abre conversación con el número del admin
   - Validación de número teléfono
   - Enlace de apertura de conversación
   - Estado: NO IMPLEMENTADO ❌

---

## 🔧 PLAN DE IMPLEMENTACIÓN (5 FASES)

### FASE 1A: Preparación de Variables de Entorno
**Archivo:** `server/.env`  
**Acción:** Agregar variables (sin valores reales por ahora)
```env
# Support Admin Configuration
SUPPORT_EMAIL=
SUPPORT_PHONE=
SUPPORT_ADMIN_ID=
SUPPORT_ADMIN_PASSWORD=

# SMTP Configuration (para futuro)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

**Resultado esperado:** ✅ Variables listas para configuración futura

---

### FASE 1B: Estructura de Base de Datos
**Acción:** Crear tabla support_responses

```sql
CREATE TABLE support_responses (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
  admin_id TEXT NOT NULL REFERENCES users(id),
  response_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_ticket_id (ticket_id),
  INDEX idx_admin_id (admin_id)
);

ALTER TABLE support_tickets ADD COLUMN response_status VARCHAR(20) DEFAULT 'pending' CHECK (response_status IN ('pending', 'responded', 'closed'));
```

**Verificación:** Ver que ambas tablas existan

---

### FASE 2A: Endpoints de Administrador
**Archivo:** `server/src/index.js`

#### Endpoint 1: GET `/api/admin/tickets`
- Requiere autenticación
- Requiere verificar si el usuario es admin
- Retorna todos los tickets con sus respuestas
- Paginación (10 por página)

#### Endpoint 2: GET `/api/admin/tickets/:ticketId`
- Retorna ticket específico con historial completo
- Retorna todas las respuestas del admin

#### Endpoint 3: POST `/api/admin/tickets/:ticketId/response`
- Requiere autenticación + permiso de admin
- Guarda respuesta en support_responses
- Actualiza response_status en support_tickets
- Prepara envío de correo (sin enviar aún si SMTP no está listo)

#### Endpoint 4: PATCH `/api/admin/tickets/:ticketId/status`
- Cambia estado del ticket (pending, responded, closed)
- Registra en logs

---

### FASE 2B: Sistema de Correos (Estructura)
**Librerías:**
```bash
npm install nodemailer
```

**Archivo:** `server/src/mailer.js` (NUEVO)
```javascript
// Configurar Nodemailer
// Si SMTP no está listo, retornar error amigable
// Plantillas de correo:
// 1. Notificación a admin cuando recibe un ticket
// 2. Respuesta a cliente cuando admin responde
// NO ENVIAR hasta que SMTP esté configurado
```

**En endpoint de soporte:**
- Si SMTP está configurado: enviar correo a admin
- Si SMTP no está: guardar ticket, mostrar mensaje "Correo pendiente"

---

### FASE 3A: Panel Administrativo (Frontend)
**Archivo:** `client/src/main.jsx`

#### Nueva vista: `AdminTicketsView`
- Reachable desde `/admin/tickets` o panel especial
- Solo accesible para usuario admin (verificar en backend)
- Mostrar lista de tickets
- Filtros: Estado (nuevo, respondido, cerrado), Fecha
- Click en ticket → ver detalles
- Formulario de respuesta
- Historial de conversación

**Protección:**
```javascript
// En App() o antes de renderizar AdminTicketsView
if (!user || user.role !== 'admin') {
  return <div>Acceso denegado</div>;
}
```

---

### FASE 3B: UI del Cliente (Mejoras)
**Archivo:** `client/src/main.jsx` - SupportView

**Mostrar:**
```
📧 Correo de soporte: [SUPPORT_EMAIL si está configurado]
📞 Teléfono: [SUPPORT_PHONE si está configurado]
💬 WhatsApp: [Botón si SUPPORT_PHONE es válido]
⏰ Horario: Lunes a viernes, 9:00-18:00
⏱️ Respuesta: Generalmente en 24 horas
```

**No mezclar:** 
- Datos del CLIENTE (nombre, email que ingresa)
- Datos del ADMIN (correo, teléfono para contactar)

---

### FASE 4: Seguridad y Aislamiento
**Verificaciones:**

1. ✅ Usuario autenticado NO puede ver tickets de otros usuarios
2. ✅ Usuario NO autenticado NO puede acceder a panel de admin
3. ✅ Solo usuario con role='admin' VE panel administrativo
4. ✅ Credenciales SMTP NO se exponen al frontend
5. ✅ Admin_password se verifica en backend (NO en frontend)

---

### FASE 5: Pruebas Completas
**Antes de terminar, verificar:**

| Función | Prueba | Estado |
|---------|--------|--------|
| Registro | Crear cuenta nueva | ⬜ Pendiente |
| Login | Iniciar sesión | ⬜ Pendiente |
| Dashboard | Ver estadísticas | ⬜ Pendiente |
| Negocios | Crear/editar/eliminar | ⬜ Pendiente |
| Reseñas | Ver reseñas de negocios | ⬜ Pendiente |
| Guía | Completar pasos de guía | ⬜ Pendiente |
| Widget | Copiar código del widget | ⬜ Pendiente |
| Soporte - Cliente | Enviar ticket | ⬜ Pendiente |
| Soporte - Admin | Ver tickets | ⬜ Pendiente |
| Soporte - Admin | Responder ticket | ⬜ Pendiente |
| Persistencia | Datos se guardan en BD | ⬜ Pendiente |
| Aislamiento | Usuarios NO ven tickets ajenos | ⬜ Pendiente |

---

## 📝 CONFIGURACIÓN NECESARIA (Por ti, después)

Cuando estés listo para activar, necesitaré:

### Correo Administrativo
```
SUPPORT_EMAIL = tu_correo_real@gmail.com
```

### Teléfono Administrativo (Opcional)
```
SUPPORT_PHONE = +34 123 456 789
```

### Configuración SMTP (Si quieres enviar correos)
**Opción 1: Gmail**
```
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_USER = tu_correo@gmail.com
SMTP_PASS = tu_contraseña_de_aplicacion
SMTP_FROM = tu_correo@gmail.com
```

**Opción 2: Otro servidor**
```
SMTP_HOST = mail.ejemplo.com
SMTP_PORT = 587 (o el de tu proveedor)
SMTP_USER = tu_usuario
SMTP_PASS = tu_contraseña
SMTP_FROM = noreply@ejemplo.com
```

### Usuario Administrador
```
SUPPORT_ADMIN_ID = ID del usuario que será admin
SUPPORT_ADMIN_PASSWORD = Contraseña para panel admin
```

---

## 🎯 RESUMEN DE IMPLEMENTACIÓN

### Lo que haré AHORA (Esta sesión):

1. ✅ Agregar variables de entorno vacías
2. ✅ Crear tabla support_responses
3. ✅ Implementar endpoints de admin (/api/admin/tickets)
4. ✅ Crear página AdminTicketsView en frontend
5. ✅ Mejorar UI de SupportView con datos reales del admin
6. ✅ Estructurar sistema de correos (sin enviar aún)
7. ✅ Implementar lógica de protección de datos
8. ✅ Pruebas de regresión completas

### Lo que haremos DESPUÉS (Cuando configures datos):

1. ⬜ Agregar tu correo real a SUPPORT_EMAIL
2. ⬜ Agregar tu teléfono real a SUPPORT_PHONE
3. ⬜ Configurar SMTP (Gmail, Outlook, etc.)
4. ⬜ Activar envío de correos automáticos
5. ⬜ Activar botón de WhatsApp
6. ⬜ Pruebas finales con datos reales

---

## ⚠️ NOTAS IMPORTANTES

- **SIN DATOS INVENTADOS:** No agregaré direcciones, teléfonos ni credenciales ficticias
- **SEGURO:** El backend valida todo, no confiamos en el frontend
- **MODULAR:** Cada fase se prueba por separado
- **SIN ROMPER:** Las funcionalidades existentes se mantienen intactas
- **LOCAL ONLY:** No se desplegará a Internet hasta que todo esté verificado

---

## 📋 SIGUIENTE PASO

Estoy listo para implementar **FASE 1 - Preparación Completa**.

¿Procedera? Yo:
1. ✅ Agregar variables de entorno
2. ✅ Crear tabla support_responses
3. ✅ Estructurar el código para admin
4. ✅ Crear endpoints básicos
5. ✅ Implementar frontend para admin
6. ✅ Hacer pruebas de regresión

Tú (después):
1. Me proporcionas tu correo real
2. Me proporcionas tu teléfono real (opcional)
3. Me configuramos SMTP si lo necesitas
4. Activamos las notificaciones por correo

¿Continuamos? ✅

