# 📋 PLAN DE IMPLEMENTACIÓN - SISTEMA COMERCIAL DE PLANES Y SUSCRIPCIONES

**Fecha:** 2026-10-17  
**Estado:** AUDITORÍA COMPLETADA - LISTO PARA IMPLEMENTAR  
**Modelo:** Sistema de 3 planes con Stripe (modo prueba)

---

## 🔍 AUDITORÍA ARQUITECTURA ACTUAL

### Stack Actual
- **Backend:** Express.js + Knex + PostgreSQL
- **Frontend:** React 18 SPA + Vite
- **Auth:** JWT + Bcryptjs
- **Email:** Nodemailer + Gmail SMTP (ya integrado)
- **Stripe:** ❌ NO INSTALADO

### Estructura DB Actual
```
users
├─ id (nanoid)
├─ name, email, passwordHash
├─ createdAt

businesses (user_id FK)
├─ id, userId, name, type, description
├─ shareLink, createdAt

reviews (business_id FK)
├─ id, businessId, author, rating, text
├─ platform, createdAt

support_tickets
support_responses
onboarding_progress
```

### Endpoints Existentes
- Auth: POST /api/auth/signup, /api/auth/login, GET /api/auth/me
- Dashboard: GET /api/dashboard
- Businesses: GET/POST/PUT/DELETE /api/businesses
- Reviews: GET /api/reviews
- Public: GET /api/public/business/:shareLink, POST reviews
- Support: GET/POST /api/admin/tickets, /api/support/contact

### Limitaciones Actuales
- ❌ No hay tracking de suscripciones
- ❌ No hay límites de negocios por usuario
- ❌ No hay información de planes

---

## 📦 PLANES COMERCIALES FINALES

```
STARTER          PROFESSIONAL        BUSINESS
$19/mes          $39/mes ⭐          $79/mes
$182.40/año      $374.40/año         $758.40/año
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1 negocio        3 negocios          10 negocios
Básico           + Gestión           + Estadísticas
                 independiente       + Soporte
```

Descuento anual: 20% (mensual × 12 = annual × 1.2)

---

## 🛠️ FASES DE IMPLEMENTACIÓN

### FASE 1: Setup de Stripe (1 día)
**Tareas:**
1. Instalar `stripe` npm
2. Configurar claves Stripe en .env (MODO PRUEBA)
3. Crear 3 productos con 6 precios (3 × 2 periodicidades)
4. Documentar IDs de Stripe

**Archivos:**
- server/package.json (agregar stripe)
- server/.env (agregar STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY)
- Documentación: STRIPE-SETUP.md

**Validación:**
```bash
✓ Stripe SDK funciona
✓ Claves de prueba cargadas
✓ Productos/precios creados en Stripe Dashboard
```

---

### FASE 2: Modelo de Base de Datos (1 día)
**Tareas:**
1. Crear migración 006_add_subscriptions.js
   - Tabla: subscriptions (user_id, plan, status, stripe_customer_id, stripe_subscription_id, period_start, period_end)
   - Tabla: subscription_history (audit trail)

2. Crear migración 007_add_billing_fields.js
   - users: agregar stripe_customer_id, default_plan (default: 'starter')
   - businesses: agregar createdAt si no existe

**Archivos:**
- server/migrations/006_add_subscriptions.js
- server/migrations/007_add_billing_fields.js

**Validación:**
```bash
✓ Migraciones se ejecutan sin errores
✓ Tablas creadas en PostgreSQL
✓ Datos existentes no se pierden
```

---

### FASE 3: Backend - Endpoints de Planes y Suscripciones (2 días)

#### 3.1 Endpoints de Productos
```
GET /api/billing/plans
  Response: [{id, name, price_monthly, price_yearly, business_limit, features}]

GET /api/billing/subscription
  Auth: required
  Response: {plan, status, period_end, ...}
```

#### 3.2 Endpoints de Checkout
```
POST /api/billing/checkout
  Auth: required
  Body: {plan: 'starter|professional|business', billing: 'monthly|yearly'}
  Response: {sessionId} (Stripe Checkout ID)

GET /api/billing/checkout/success
  Query: session_id
  Response: {subscription, redirect_to_dashboard}
```

#### 3.3 Endpoints de Gestión
```
POST /api/billing/cancel-subscription
  Auth: required
  Response: {status: 'canceled'}

PUT /api/billing/change-plan
  Auth: required
  Body: {plan: 'starter|professional|business', billing: 'monthly|yearly'}
  Response: {subscription, invoice_url}
```

#### 3.4 Webhook de Stripe
```
POST /webhooks/stripe
  No Auth (firmado por Stripe)
  Events: 
    - charge.succeeded
    - customer.subscription.created
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.payment_failed
```

#### 3.5 Validación de Límites
- Middleware: checkBusinessLimit(user_id)
- Validar antes de crear negocio
- Error 403 si excede límite: "Upgrade to create more businesses"

**Archivos:**
- server/src/billing.js (module con funciones)
- server/src/index.js (actualizar con endpoints)
- server/src/stripe-webhook.js

**Validación:**
```bash
✓ GET /api/billing/plans retorna 3 planes
✓ POST /api/billing/checkout genera sesión real en Stripe
✓ Middleware de límites funciona
✓ Webhook verifica firma correctamente
```

---

### FASE 4: Frontend - Página de Precios (1.5 días)

#### 4.1 Componente PricingPage
**Ubicación:** client/src/components/PricingPage.jsx

**Features:**
- 3 tarjetas de planes
- Selector mensual/anual (toggle)
- Professional destacado como "MÁS POPULAR"
- Cálculo visual del descuento anual
- Botones "Contratar" → Stripe Checkout
- Estado de carga
- Mensajes de error
- Responsive (mobile-first)

**Datos:**
```javascript
PLANS = [
  {id: 'starter', name: 'Starter', monthly: 19, yearly: 182.40, businesses: 1, ...},
  {id: 'professional', name: 'Professional', monthly: 39, yearly: 374.40, businesses: 3, ...},
  {id: 'business', name: 'Business', monthly: 79, yearly: 758.40, businesses: 10, ...}
]
```

#### 4.2 Componente BillingPage (Dashboard)
**Ubicación:** client/src/components/BillingPage.jsx

**Features:**
- Mostrar plan actual del usuario
- Fecha de renovación
- Botón "Cambiar plan"
- Botón "Cancelar suscripción"
- Historial de facturas
- Información de pago

#### 4.3 Integración en Rutas
- Ruta pública: /pricing
- Ruta privada: /dashboard/billing
- Ruta post-checkout: /checkout/success?session_id=xxx

**Archivos:**
- client/src/components/PricingPage.jsx
- client/src/components/BillingPage.jsx
- client/src/pages/CheckoutSuccess.jsx
- client/src/main.jsx (agregar rutas)

**Validación:**
```bash
✓ /pricing carga sin errores
✓ Selector mensual/anual funciona
✓ Botones "Contratar" abren Stripe Checkout
✓ Responsive en mobile/tablet/desktop
```

---

### FASE 5: Integración de Límites (1 día)

#### 5.1 Validación Backend
Modificar `POST /api/businesses`:
1. Verificar plan actual del usuario
2. Contar negocios existentes
3. Validar límite según plan
4. Rechazar si excede

#### 5.2 UI de Límites
- Mensaje: "Has alcanzado tu límite de negocios (1/1)"
- Botón: "Upgrade a Professional"
- Link directo a /pricing

**Archivos:**
- server/src/index.js (actualizar endpoint)
- client/src/components/BusinessesList.jsx (agregar mensaje)

**Validación:**
```bash
✓ Usuario Starter: máx 1 negocio
✓ Usuario Professional: máx 3 negocios
✓ Usuario Business: máx 10 negocios
✓ Usuario sin suscripción: defecto Starter
```

---

### FASE 6: Pruebas End-to-End (1 día)

#### 6.1 Pruebas Funcionales
```
1. Página de precios
   ✓ Carga correctamente
   ✓ Selector mensual/anual funciona
   ✓ Precios son exactos

2. Checkout
   ✓ Abre Stripe (test mode)
   ✓ Acepta tarjeta de prueba: 4242 4242 4242 4242
   ✓ Retorna a success?session_id=...

3. Datos en BD
   ✓ Suscripción guardada
   ✓ stripe_customer_id grabado
   ✓ Estado: "active"

4. Límites
   ✓ Starter: 1 negocio máx
   ✓ Professional: 3 negocios máx
   ✓ Business: 10 negocios máx

5. Regresiones
   ✓ Auth sigue funcionando
   ✓ Dashboard sigue funcionando
   ✓ Negocios/reseñas siguen funcionando
   ✓ Sistema de soporte sigue funcionando
```

#### 6.2 Pruebas de Seguridad
```
✓ Claves Stripe nunca en frontend
✓ Claves Stripe nunca en logs
✓ Webhook verifica firma correctamente
✓ Usuarios no pueden falsificar suscripciones
✓ Backend es source of truth
✓ Cobros reales están deshabilitados
```

---

## 📊 TABLA DE ARCHIVOS

| Archivo | Acción | Tipo |
|---------|--------|------|
| server/.env | Agregar claves Stripe | Config |
| server/package.json | Instalar stripe | Dependency |
| server/migrations/006_*.js | Nueva migración | Migration |
| server/migrations/007_*.js | Nueva migración | Migration |
| server/src/billing.js | Crear módulo | Business Logic |
| server/src/stripe-webhook.js | Crear webhook handler | Endpoint |
| server/src/index.js | Actualizar endpoints | Backend |
| client/src/components/PricingPage.jsx | Crear | Component |
| client/src/components/BillingPage.jsx | Crear | Component |
| client/src/pages/CheckoutSuccess.jsx | Crear | Page |
| client/src/main.jsx | Agregar rutas | Frontend |
| STRIPE-SETUP.md | Crear guía | Docs |

---

## 🎯 CRITERIOS DE ÉXITO

✅ Planes correctamente configurados  
✅ Página de precios carga y funciona  
✅ Checkout de Stripe funciona en modo prueba  
✅ Suscripciones se guardan en BD  
✅ Límites de negocios se validan en backend  
✅ UI muestra límites correctamente  
✅ Webhooks procesan eventos correctamente  
✅ Datos existentes no se pierden  
✅ Todas las regresiones pasan  
✅ Código seguro (sin exposición de claves)  

---

## ⚠️ SUPUESTOS Y RESTRICCIONES

1. **Modo Prueba Obligatorio**
   - Solo test keys de Stripe
   - No hay cobros reales
   - Datos de prueba solamente

2. **Base de Datos**
   - PostgreSQL ya está ejecutándose
   - Migración 005 ya está aplicada
   - No hay corrupción de datos existentes

3. **Frontend**
   - React 18 con Vite
   - Compatibilidad con componentes existentes
   - No hay cambios en auth/dashboard principal

4. **Documentación**
   - Guía de Stripe Setup
   - Instrucciones de prueba
   - Documentación de endpoints

---

## 📅 ESTIMACIÓN DE TIEMPO

| Fase | Tarea | Días | Hito |
|------|-------|------|------|
| 1 | Setup Stripe | 1 | Claves configuradas ✓ |
| 2 | DB Migrations | 1 | Tablas creadas ✓ |
| 3 | Backend | 2 | Endpoints funcionales ✓ |
| 4 | Frontend | 1.5 | UI implementada ✓ |
| 5 | Límites | 1 | Validación funcional ✓ |
| 6 | Testing | 1 | Pruebas E2E ✓ |
| **TOTAL** | | **7.5 días** | |

---

## 🚀 PRÓXIMO PASO

**Fase 1: Setup de Stripe**
1. Generar claves de prueba en Stripe Dashboard
2. Instalar SDK stripe
3. Agregar variables de entorno
4. Crear productos y precios en Stripe

➡️ **Iniciaré con la Fase 1 si apruebas este plan.**

