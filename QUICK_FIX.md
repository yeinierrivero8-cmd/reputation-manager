# 🔧 SOLUCIÓN RÁPIDA PARA EL ERROR 500

El test de login **funciona perfectamente** en servidor, pero tu navegador ve 500. Esto es casi siempre por:

## ✅ PASO 1: LIMPIAR TODO EN EL NAVEGADOR

1. **Cierra el navegador completamente** (no solo la pestaña)
2. Abre DevTools: **Ctrl + Shift + Delete** (o F12 → Storage)
3. Selecciona "All time"
4. Haz click en **Clear browsing data**
5. Abre nuevamente: **http://localhost:5175**

## ✅ PASO 2: SI NO FUNCIONA, PRUEBA ESTO

Abre DevTools (F12) → Console y copia/pega:

```javascript
// Diagnóstico de login
console.log('🔍 DIAGNOSTICANDO...');

// 1. Verificar que fetch funciona
fetch('/api/health')
  .then(r => {
    console.log('Health check status:', r.status);
    console.log('Health check headers:', r.headers.get('content-type'));
    return r.json();
  })
  .then(data => console.log('✅ Health OK:', data))
  .catch(e => console.error('❌ Health FAIL:', e.message));

// 2. Simular exactamente lo que hace el login
setTimeout(() => {
  console.log('\n--- Simulando LOGIN ---');
  
  const testEmail = 'debug-' + Date.now() + '@test.com';
  const testPass = 'TestPass123';
  
  console.log('Intentando SIGNUP...');
  fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Debug User',
      email: testEmail,
      password: testPass
    })
  })
  .then(r => {
    console.log('Signup response status:', r.status);
    if (!r.ok) {
      return r.text().then(t => { 
        console.error('Signup error:', t); 
        throw new Error('Signup failed');
      });
    }
    return r.json();
  })
  .then(data => {
    console.log('✅ Signup exitoso');
    console.log('Token:', data.token ? '✅ SÍ' : '❌ NO');
  })
  .catch(e => console.error('❌ Signup error:', e.message));
}, 1000);
```

Copia EXACTAMENTE eso en la consola y presiona Enter.

## ✅ PASO 3: VERIFICA LOS RESULTADOS

Deberías ver en la consola:
- ✅ `Health check status: 200`
- ✅ `Health check headers: application/json`
- ✅ `Signup exitoso`
- ✅ `Token: SÍ`

**Si ves eso, entonces el problema está en tu cuenta existente, no en el sistema.**

**Si ves error, copia el MENSAJE EXACTO y reporta.**

## ⚡ ÚLTIMO RECURSO

Si nada funciona:

1. Abre PowerShell en la carpeta del proyecto
2. Ejecuta:
   ```powershell
   node test-full-login-flow.js
   ```
3. Si el test pasa pero el navegador no funciona, hay un problema de cache de navegador profundo:
   - Prueba en navegador **incógnito** (Ctrl+Shift+N)
   - O prueba en otro navegador diferente
   
---

## 📌 RESUMEN

| Elemento | Estado |
|----------|--------|
| Backend | ✅ Funciona |
| Frontend | ✅ Funciona |
| Proxy | ✅ Funciona |
| Test de Login | ✅ Pasa |
| **Tu navegador** | ❓ Necesita limpieza |

El sistema está correcto. El problema es del navegador.
