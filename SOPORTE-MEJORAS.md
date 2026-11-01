# 🚀 MEJORAS DE FORMULARIO DE SOPORTE - ReputationManager

**Fecha:** 2026-10-16  
**Estado:** ✅ IMPLEMENTADO Y LISTO PARA PRUEBAS  

---

## 📋 CAMBIOS REALIZADOS

### Frontend (`client/src/main.jsx`)

#### 1. **Paso del parámetro `user` a SupportView**
```javascript
// ANTES
<SupportView showToast={showToast}/>

// DESPUÉS
<SupportView user={user} showToast={showToast}/>
```

#### 2. **Autocompletar datos del usuario**
```javascript
// AGREGADO
useEffect(() => {
  if (user) {
    setName(user.name || '');
    setEmail(user.email || '');
  }
}, [user]);
```

#### 3. **Inicialización con datos del usuario**
```javascript
// ANTES
const [name, setName] = useState('');
const [email, setEmail] = useState('');

// DESPUÉS
const [name, setName] = useState(user?.name || '');
const [email, setEmail] = useState(user?.email || '');
```

#### 4. **No limpiar nombre y email después de enviar**
```javascript
// ANTES
setName('');
setEmail('');
setSubject('');
setMessage('');

// DESPUÉS
// Solo limpia subject y message
setSubject('');
setMessage('');
// Mantiene name y email para comodidad del usuario
```

#### 5. **Mejor sección "Otros canales"**
```javascript
// ANTES
<p><strong>Horario:</strong> Disponibles de lunes a viernes, 9:00 - 18:00</p>
<p><strong>Tiempo de respuesta:</strong> Generalmente respondemos en 24 horas</p>

// DESPUÉS
<div><strong>📧 Correo de soporte:</strong>
<p>support@reputationmanager.com</p></div>
<div><strong>⏰ Horario de atención:</strong>
<p>Lunes a viernes, 9:00 - 18:00 (hora local)</p></div>
<div><strong>⏱️ Tiempo de respuesta:</strong>
<p>Generalmente respondemos en 24 horas hábiles</p></div>
```

### Backend (`server/src/index.js`)

#### 1. **Validación de token de autenticación**
```javascript
// AGREGADO
let userId = null;
const authHeader = req.headers.authorization;
if (authHeader && authHeader.startsWith('Bearer ')) {
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.id;
  } catch (e) {
    // Token inválido pero permite solicitud anónima
  }
}
```

#### 2. **Asociación del ticket al usuario**
```javascript
// AGREGADO - Intenta guardar con user_id
await client.query(
  `INSERT INTO support_tickets (id, ticket_id, user_id, name, email, subject, message, status, email_sent, created_at)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
  [id, ticketId, userId, ...]
);
```

#### 3. **Fallback si la columna user_id no existe**
```javascript
// AGREGADO - Manejo graceful de columna faltante
catch (e) {
  if (e.message.includes('user_id')) {
    // Reintentar sin user_id
    await client.query(`INSERT INTO support_tickets (...) VALUES (...)`, [...]);
  } else {
    throw e;
  }
}
```

---

## 🧪 CASOS DE PRUEBA

### **CASO A: Usuario autenticado con nombre y correo**

**Pasos:**
1. Abre la aplicación en http://localhost:5175
2. Haz login con credenciales válidas
3. Ve a "Contactar soporte" (en el menú o en el help-card)
4. Observa el formulario

**Resultado esperado:**
- ✅ Campo "Tu nombre" contiene el nombre del perfil
- ✅ Campo "Tu correo" contiene el email de la cuenta
- ✅ Los campos no están vacíos
- ✅ Puedes editar los campos
- ✅ La edición NO cambia tu perfil

---

### **CASO B: Usuario autenticado sin nombre (hipotético)**

**Nota:** No aplica si todos los usuarios tienen nombre, pero el código lo maneja

**Resultado esperado:**
- ✅ Campo "Tu nombre" está vacío
- ✅ Puedes escribir tu nombre
- ✅ Campo "Tu correo" contiene el email

---

### **CASO C: Envío válido**

**Pasos:**
1. Completa el formulario:
   - Tu nombre: [Nombre actual o modificado]
   - Tu correo: [Email actual o modificado]
   - Asunto: "Tengo una pregunta sobre el widget"
   - Mensaje: "¿Cómo instalo el widget en mi página web?"
2. Presiona "Enviar mensaje"

**Resultado esperado:**
- ✅ Se muestra "✓ ¡Solicitud registrada!"
- ✅ Aparece un número de seguimiento
- ✅ Muestra estado del correo (configurado o no)
- ✅ Aparece botón "Enviar otra solicitud"
- ✅ El ticket se guarda en `support_tickets`

**En la BD (PostgreSQL):**
```sql
SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 1;
-- Debería mostrar el ticket con todos los campos completos
-- user_id puede estar NULL (para solicitudes anónimas)
```

---

### **CASO D: Envío inválido**

**Pasos (intenta enviar con datos inválidos):**

| Escenario | Entrada | Error esperado |
|-----------|---------|----------------|
| Nombre muy corto | "A" | "El nombre debe tener al menos 2 caracteres" |
| Email inválido | "notanemail" | "Ingresa un correo válido" |
| Asunto muy corto | "Hola" | "El asunto debe tener al menos 5 caracteres" |
| Mensaje muy corto | "Hola" | "El mensaje debe tener al menos 10 caracteres" |
| Campo vacío | (dejar en blanco) | "Todos los campos son obligatorios" |

**Resultado esperado:**
- ✅ Se muestra mensaje de error específico
- ✅ El formulario NO se envía
- ✅ Los datos se mantienen en los campos
- ✅ Puedes corregir y reintentar

---

### **CASO E: Usuario no autenticado (opcional)**

**Nota:** La URL pública es `/review/{shareLink}`, no tiene acceso a "Contactar soporte"

**Resultado esperado:**
- ✅ Solo usuarios autenticados ven "Contactar soporte"
- ✅ El endpoint funciona para ambos (autenticados y anónimos)

---

### **CASO F: Persistencia**

**Pasos:**
1. Envía un ticket con éxito
2. Nota el número de seguimiento
3. Recarga la página (F5)
4. Abre "Contactar soporte" nuevamente
5. Verifica en la BD

**Resultado esperado:**
- ✅ El ticket sigue en `support_tickets`
- ✅ El número de seguimiento es el mismo
- ✅ Todos los datos están intactos

```sql
SELECT ticket_id, name, email, subject, created_at FROM support_tickets WHERE ticket_id = 'TU_NUMERO';
```

---

### **CASO G: Regresión (Nada se rompió)**

**Prueba que todas estas funciones aún funcionan:**

| Función | Pasos | Resultado |
|---------|-------|-----------|
| **Login** | Abre app → Login | ✅ Acceso al dashboard |
| **Signup** | Ir a /signup | ✅ Crear cuenta funciona |
| **Dashboard** | Click en "Resumen" | ✅ Muestra estadísticas |
| **Negocios** | Click en "Mis negocios" | ✅ Lista de negocios |
| **Reseñas** | Click en "Reseñas recibidas" | ✅ Muestra reseñas |
| **Widget** | Click en "Widget para web" | ✅ Generador de código |
| **Guía** | Click en "Guía de inicio" | ✅ Pasos interactivos |
| **Configuración** | Click en "Configuración" | ✅ Editar perfil |
| **Menú** | Abre menú lateral | ✅ Solo UNA "Configuración" (no dos) |

---

## 🔍 VERIFICACIÓN DE DATOS EN BD

### Conectar a PostgreSQL

```bash
# Desde PowerShell
psql -U postgres -d reputation_manager_dev -h localhost -p 5433
```

### Ver estructura de support_tickets

```sql
\d support_tickets
```

**Columnas esperadas:**
- `id` (uuid/string)
- `ticket_id` (string - identificador único de seguimiento)
- `user_id` (uuid/string - puede ser NULL para solicitudes anónimas)
- `name` (text)
- `email` (text)
- `subject` (text)
- `message` (text)
- `status` (text - ej: 'new', 'in_progress', 'resolved')
- `email_sent` (boolean)
- `created_at` (timestamp)

### Ver tickets guardados

```sql
-- Ver último ticket
SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 1;

-- Ver todos los tickets
SELECT ticket_id, name, email, subject, created_at FROM support_tickets;

-- Ver tickets de un usuario específico (si user_id está disponible)
SELECT * FROM support_tickets WHERE user_id = 'USER_ID_HERE';
```

---

## 📊 CONFIGURACIÓN SMTP

### Estado actual:
- **SMTP Configurado:** ❌ No (según lógica del backend)
- **Resultado en UI:** Muestra "El sistema de correos aún no está configurado"

### Para configurar SMTP (futuro):

1. Agregar variables de entorno en `.env`:
```env
SMTP_HOST=smtp.tuproveedor.com
SMTP_PORT=587
SUPPORT_EMAIL=support@tudominio.com
SMTP_USER=tu-email@tudominio.com
SMTP_PASSWORD=tu-contraseña
```

2. El backend detectará automáticamente la configuración

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] Frontend compila sin errores
- [ ] Backend inicia sin errores
- [ ] **CASO A:** Campos se rellenan con datos del usuario
- [ ] **CASO B:** Puedo editar los campos sin afectar el perfil
- [ ] **CASO C:** El ticket se guarda en BD
- [ ] **CASO C:** Recibo número de seguimiento
- [ ] **CASO D:** Mensajes de error funcionan
- [ ] **CASO F:** Ticket persiste después de recargar
- [ ] **CASO G:** Todas las funciones siguen funcionando
- [ ] **Menú:** Solo una "Configuración" (sin duplicados)
- [ ] **BD:** support_tickets tiene los datos correctos
- [ ] **Seguridad:** Token se valida correctamente
- [ ] **Seguridad:** Usuario_id se asocia si está autenticado
- [ ] **UI:** La sección "Otros canales" se ve profesional

---

## 📝 ARCHIVOS MODIFICADOS

1. **`client/src/main.jsx`**
   - Línea 259: Paso de `user` a SupportView
   - Línea 297: Función SupportView completamente actualizada

2. **`server/src/index.js`**
   - Líneas 412-475: Endpoint `/api/support/contact` mejorado
   - Validación de token
   - Asociación de user_id
   - Fallback graceful

---

## 🚀 PRÓXIMOS PASOS

### Inmediato (requiere pruebas):
1. ✅ Probar todos los casos A-G
2. ✅ Verificar en PostgreSQL
3. ✅ Confirmar que no hay regresiones

### Opcional (implementar después):
1. Panel administrativo para ver/responder tickets
2. Configurar SMTP para enviar confirmaciones
3. Automatizar respuestas a tickets
4. Integración con slack/email para notificaciones

---

## 💡 NOTAS DE SEGURIDAD

✅ **Implementado:**
- Token JWT se valida correctamente
- `user_id` se obtiene del token validado (no del frontend)
- Datos de usuario autenticado no se exponen en logs
- Solicitudes anónimas también funcionan
- Validación de campos (frontend y backend)

⚠️ **Pendiente de verificar:**
- Rate limiting en el endpoint (proteger contra spam)
- CSRF tokens (si es necesario)
- Validación de email (confirmar que el email existe)

---

**Estado Final:** 🟢 LISTO PARA PRUEBAS

Todos los cambios han sido implementados. Ahora ejecuta los casos de prueba para verificar que todo funciona correctamente.

