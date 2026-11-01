# CONFIGURAR STRIPE WEBHOOK - GUÍA PASO A PASO

**Aplicación:** ReputationManager  
**Endpoint:** POST `/webhooks/stripe`  
**Modo:** TEST (nunca producción)  
**Seguridad:** Validación de firma (cuando secret esté configurado)

---

## 📋 PRE-REQUISITOS

✅ Cuenta de Stripe (https://stripe.com)  
✅ Modo TEST activado  
✅ Servidor ReputationManager corriendo  
✅ URL pública accesible (o túnel local para desarrollo)

---

## 🔧 CONFIGURAR WEBHOOK EN STRIPE DASHBOARD

### Paso 1: Acceder a Webhooks
1. Ir a **https://dashboard.stripe.com/test/webhooks**
2. Iniciar sesión si es necesario
3. Buscar sección **"Webhooks"** en la barra lateral izquierda

### Paso 2: Crear Nuevo Endpoint
1. Hacer clic en **"Add an endpoint"**
2. Ingresar URL del endpoint:
   ```
   https://yourdomain.com/webhooks/stripe
   ```
   
   **Para desarrollo local:**
   ```
   Usar Stripe CLI (ver opción alternativa abajo)
   ```

### Paso 3: Seleccionar Eventos
Hacer clic en **"Select events"** y seleccionar:

**Suscripciones (REQUERIDO):**
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`  
- ✅ `customer.subscription.deleted`

**Opcionales (pero recomendados):**
- ⭕ `invoice.payment_succeeded`
- ⭕ `invoice.payment_failed`
- ⭕ `charge.refunded`

### Paso 4: Crear Endpoint
1. Hacer clic en **"Add endpoint"**
2. El endpoint será creado
3. **IMPORTANTE:** Una vez creado, recibirás el **Signing Secret**

---

## 🔑 OBTENER EL SIGNING SECRET (Sin revelarlo)

### Opción 1: Desde Stripe Dashboard

**Localizar el secret:**
1. En **Webhooks**, encontrar tu endpoint `/webhooks/stripe`
2. Hacer clic en el endpoint para abrir detalles
3. En la sección **"Signing secret"**, verás:
   ```
   whsec_test_1234567890abcdefghijklmnop...
   ```

**Copiar sin revelar:**
1. Hacer clic en **"Reveal"** (al lado del secret)
2. El secret se mostrará brevemente
3. Copiar el valor completo (comienza con `whsec_test_`)
4. **NO compartir** este valor por chat, email, o ctrl+v en público

**Formato esperado:**
```
whsec_test_[38 caracteres alfanuméricos]
```

### Opción 2: Usar Stripe CLI (Para desarrollo local)

```bash
# 1. Instalar Stripe CLI
# Windows: https://stripe.com/docs/stripe-cli
# macOS: brew install stripe/stripe-cli/stripe
# Linux: similar a macOS

# 2. Autenticar
stripe login

# 3. Configurar webhook local
stripe listen --forward-to http://localhost:5005/webhooks/stripe

# Salida:
# Ready! Your webhook signing secret is whsec_test_...
#
# Ready to accept events!

# 4. El secret se mostrará en la terminal
# Copiar a server/.env
```

---

## 🔒 ACTUALIZAR server/.env

**IMPORTANTE:** No inventar secreto - usar el valor real de Stripe

### Paso 1: Editar Archivo
```bash
# Abrir: server/.env
# Línea 36
```

### Paso 2: Cambiar Valor
```env
# ANTES:
STRIPE_WEBHOOK_SECRET=whsec_test_placeholder

# DESPUÉS:
STRIPE_WEBHOOK_SECRET=whsec_test_1234567890abcdefghijklmnop...
```

### Paso 3: Reiniciar Servidor
```bash
# Si estaba corriendo:
# 1. Ctrl+C para detener

# 2. Reiniciar:
npm run dev
```

**Verificar en logs:**
```
INFO: ReputationManager API started on http://localhost:5005
INFO: Webhook validation enabled with secret: whsec_test_...
```

---

## ✅ VERIFICAR CONFIGURACIÓN

### Test 1: Verificar que endpoint existe
```bash
curl -X POST http://localhost:5005/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{}'

# Esperado: 
# Status 400 o 401 (error de validación de firma)
# NO: 404 "Not Found"
```

### Test 2: Verificar validación de firma
```bash
curl -X POST http://localhost:5005/webhooks/stripe \
  -H "stripe-signature: invalid_signature" \
  -H "Content-Type: application/json" \
  -d '{"type": "customer.subscription.created"}'

# Esperado:
# Status 400 "Webhook error" (significa que rechazó por firma inválida)
# ✅ CORRECTO: validación está activa
```

### Test 3: Enviar evento de prueba desde Stripe
1. En Stripe Dashboard → Webhooks → tu endpoint
2. Hacer clic en **"Send test event"**
3. Seleccionar tipo de evento: `customer.subscription.created`
4. Hacer clic en **"Send test event"**
5. Ver respuesta en la interfaz de Stripe
   - ✅ `200 OK` = Éxito
   - ❌ `4xx/5xx` = Error

---

## 🔍 VERIFICAR EN LOGS

Después de configurar, revisa los logs del servidor:

```
# Si webhook fue procesado:
INFO: Webhook duplicate detected (idempotent) OR
INFO: Webhook: Subscription created for user...

# Si hay error:
ERROR: Webhook error: No userId in metadata OR
ERROR: Webhook error: Unknown price ID
```

---

## 🚨 TROUBLESHOOTING

### Error: "Webhook error: invalid request signature"
**Causa:** Secret no configurado correctamente  
**Solución:**
1. Verificar que `STRIPE_WEBHOOK_SECRET` tiene valor real (no `whsec_test_placeholder`)
2. Copiar exactamente desde Stripe Dashboard (sin espacios)
3. Reiniciar servidor
4. Reintentar

### Error: "Webhook error: No userId in metadata"
**Causa:** Payload de Stripe no incluye userId en metadata  
**Solución:**
1. Verificar que checkout incluye metadata
2. Código en `index.js` línea 900 debe tener: `metadata: { userId: req.user.id }`
3. Revisar logs de checkout

### Error: "Webhook error: Unknown price ID"
**Causa:** Price ID no coincide con los configurados  
**Solución:**
1. Verificar que precio en Stripe coincide con `BILLING_PLANS` en `index.js` línea 42-70
2. Revisar que `priceId` esté exacto (case-sensitive)

### No recibe webhooks en desarrollo local
**Causa:** Stripe no puede alcanzar URL local  
**Solución:**
1. Usar Stripe CLI: `stripe listen --forward-to http://localhost:5005/webhooks/stripe`
2. O usar ngrok: `ngrok http 5005` y configurar URL en Stripe Dashboard

---

## 📊 CONFIGURACIÓN FINAL

**Archivo:** `server/.env`
```env
# Stripe Configuration (TEST MODE ONLY)
STRIPE_SECRET_KEY=sk_test_...           ✅ TEST mode (no cambiar)
STRIPE_PUBLISHABLE_KEY=pk_test_...      ✅ TEST mode (no cambiar)
STRIPE_WEBHOOK_SECRET=whsec_test_...    🔧 CONFIGURAR CON VALOR REAL
```

**Verificación:**
```bash
# En server/.env:
grep "STRIPE_WEBHOOK_SECRET" .env
# Debe mostrar: whsec_test_[valor real]
# NO debe mostrar: whsec_test_placeholder
```

---

## 🎯 DESPUÉS DE CONFIGURAR

### 1. Reiniciar servidor
```bash
npm run dev
```

### 2. Probar cambio de plan
- Crear usuario
- Hacer checkout (si Stripe live está disponible)
- Verificar logs del webhook

### 3. Monitorear eventos
```bash
# En Stripe Dashboard
# Ir a: Webhooks → tu endpoint → Logs
# Ver eventos procesados (verde = éxito)
```

### 4. Revisar BD
```bash
# En PostgreSQL
SELECT * FROM webhook_events 
ORDER BY createdAt DESC LIMIT 10;

# Debe mostrar eventos procesados
```

---

## ✅ CHECKLIST

- [ ] Cuenta de Stripe accesible
- [ ] Modo TEST activo
- [ ] Endpoint `/webhooks/stripe` creado en Stripe
- [ ] Eventos seleccionados (subscription.created/updated/deleted)
- [ ] Signing secret obtenido de Stripe Dashboard
- [ ] `.env` actualizado con valor real
- [ ] Servidor reiniciado
- [ ] Verificación test 1 pasó (endpoint existe)
- [ ] Verificación test 2 pasó (validación de firma activa)
- [ ] Verificación test 3 pasó (evento de prueba procesado)
- [ ] Logs muestran webhooks siendo procesados

---

## 🔐 SEGURIDAD

✅ TEST mode activado siempre  
✅ No usar secret_key de producción  
✅ Validación de firma obligatoria  
✅ Webhook verifica userId  
✅ Datos se validan antes de guardar  

---

## 📞 SOPORTE

Si el webhook no funciona:
1. Revisar logs: `tail -f server/logs/app.log`
2. Verificar conexión: `curl -X POST http://localhost:5005/health`
3. Comprobar que base de datos tiene tabla `webhook_events`
4. Verificar que `.env` tiene `STRIPE_WEBHOOK_SECRET` real (no placeholder)

