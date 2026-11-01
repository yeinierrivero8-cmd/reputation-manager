# 🔧 PRUEBA MANUAL DE COPIADO - INSTRUCCIONES PASO A PASO

**IMPORTANTE:** Esta prueba DEBE realizarse en un navegador real para validar el funcionamiento real de Clipboard API.

## Prerequisitos
- ✅ Servidor backend ejecutándose (puerto 5005)
- ✅ Servidor frontend ejecutándose (puerto 5175)
- ✅ Navegador Chrome/Edge/Firefox actualizado
- ✅ Consola del navegador abierta (F12)

## PASO 1: Acceder a la aplicación

1. Abre: **http://localhost:5175**
2. Verifica que carga sin errores
3. Abre la consola del navegador con **F12** → Tab "Console"
4. Limpia la consola (click derecho → Clear console)

## PASO 2: Crear usuario de prueba

1. Haz clic en "Crear cuenta gratis"
2. Completa el formulario:
   - Nombre: `Test User`
   - Email: `test-copy-${Date.now()}@example.com` (Reemplaza ${Date.now()} con números actuales ej: test-copy-1728000000000@example.com)
   - Password: `TestPassword123`
3. Haz clic en "Crear cuenta"
4. **En la consola**, verifica que NO haya errores rojos

## PASO 3: Crear negocio de prueba

1. En el dashboard, haz clic en "+ Nuevo negocio"
2. Completa:
   - Nombre: `Test Business`
   - Tipo: `Restaurante`
   - Descripción: `Testing copy functionality`
3. Haz clic en "Crear negocio"
4. **En la consola**, observa los logs
5. Espera a que el dashboard se recargue

## PASO 4: PRUEBA A - Copiar enlace desde "Mis negocios"

### Preparación
1. Abre la consola (F12)
2. Filtra por logs que contengan "COPY" escribiendo en la consola: `clear()` para limpiar
3. Ir a "Mis negocios" (en la navegación lateral)

### Ejecutar prueba
1. Busca la tarjeta de tu negocio "Test Business"
2. Haz clic en el botón "Copiar enlace" (icono de copiar, color azul)
3. **EN LA CONSOLA**, deberías ver:
   ```
   [CLICK DEBUG] BusinessesView copy called
   [COPY DEBUG] copyLink called with shareLink: [shareLink]
   [COPY DEBUG] Full link to copy: http://localhost:5175/review/[shareLink]
   [COPY DEBUG] Starting robustCopyToClipboard
   [COPY DEBUG] Text length: 39
   [COPY DEBUG] navigator.clipboard available: true
   [COPY DEBUG] window.isSecureContext: true
   [COPY DEBUG] Using Clipboard API
   [COPY DEBUG] Clipboard API SUCCESS
   [COPY DEBUG] copyLink result: true
   ```

### Verificar resultado
1. La app debe mostrar un toast: "Enlace copiado. ¡Compártelo con tus clientes!"
2. Abre el Bloc de notas (Win+R → notepad)
3. Presiona Ctrl+V para pegar
4. **DEBE aparecer:** `http://localhost:5175/review/[algun-codigo]`
5. ✅ Si aparece → PROBLEMA 1 RESUELTO
6. ❌ Si no aparece → IR A SECCIÓN "DIAGNÓSTICO"

## PASO 5: PRUEBA B - Copiar enlace desde dashboard (BusinessMini)

### Preparación
1. Vuelve a "Resumen" (Dashboard)
2. En la sección "Mis negocios" (abajo del dashboard), verás tu negocio
3. Abre la consola

### Ejecutar prueba
1. Haz clic en el botón de copiar (icono) junto a "Test Business"
2. **EN LA CONSOLA**, deberías ver logs similares a los de PASO 4

### Verificar resultado
1. Toast debe mostrar: "Enlace copiado."
2. Pega en Bloc de notas (Ctrl+V)
3. **DEBE aparecer:** el enlace completo
4. ✅ Si aparece → Confirmado

## PASO 6: PRUEBA C - Copiar código del widget

### Preparación
1. Ir a "Widget para web" (en navegación lateral)
2. Abre la consola
3. Selecciona tu negocio en el dropdown

### Ejecutar prueba
1. Haz clic en botón azul "📋 Copiar código"
2. **EN LA CONSOLA**, deberías ver:
   ```
   [CLICK DEBUG] copyCode called
   [COPY DEBUG] widgetCode length: 148
   [COPY DEBUG] Starting robustCopyToClipboard
   [COPY DEBUG] Text length: 148
   [COPY DEBUG] navigator.clipboard available: true
   [COPY DEBUG] window.isSecureContext: true
   [COPY DEBUG] Using Clipboard API
   [COPY DEBUG] Clipboard API SUCCESS
   [COPY DEBUG] copyCode result: true
   ```

### Verificar resultado
1. Toast debe mostrar: "Código copiado al portapapeles"
2. Abre Bloc de notas
3. Presiona Ctrl+V
4. **DEBE aparecer:**
   ```
   <script src="http://localhost:5175/widget.js"></script>
   <div id="rm-widget" data-share-link="..." data-mode="compact" data-reviews="5"></div>
   ```
5. ✅ Si aparece completo → PROBLEMA 2 RESUELTO
6. ❌ Si no aparece → IR A SECCIÓN "DIAGNÓSTICO"

## PASO 7: PRUEBA D - Copiar enlace desde Guía (Paso 2)

### Preparación
1. Ir a "Guía de inicio"
2. Haz clic en "Paso 2: Obtener mi enlace público"
3. Abre la consola

### Ejecutar prueba
1. En la sección del paso 2, deberías ver un enlace con código resaltado
2. Si hay un botón de copiar, haz clic
3. **EN LA CONSOLA**, observa los logs (deben ser similares)

### Verificar resultado
1. Toast debe aparecer
2. Pega en Bloc de notas
3. **DEBE aparecer** el enlace

---

## 🔴 DIAGNÓSTICO: Si alguna prueba falla

### Verificar consola
1. Abre F12 → Console
2. Busca mensajes que empiecen con `[COPY DEBUG]`
3. Si ves `[COPY DEBUG] Clipboard API SUCCESS: true` pero NO puedes pegar:
   - **Problema de permisos del navegador**
   - Solución: Refresca la página (Ctrl+R) e intenta de nuevo

4. Si ves `[COPY DEBUG] navigator.clipboard available: false`:
   - **HTTPS no está disponible**
   - Solución: Verifica que la URL sea `http://localhost:5175` (localhost está exento de HTTPS)

5. Si ves `[COPY DEBUG] Using fallback textarea method` y luego `execCommand result: false`:
   - **El fallback también falla**
   - Esto sugiere un problema de permisos del navegador o sistema

### Verificar permisos del navegador
1. En Chrome/Edge:
   - Haz clic en el icono de candado (izquierda de la URL)
   - Verifica "Clipboard" → Permitir
   
2. En Firefox:
   - Entra en `about:preferences#privacy`
   - Busca "Permissions"
   - Verifica que "Copy to Clipboard" esté permitido

### Si ves errores en rojo
- Copia el mensaje de error exacto
- Anótalo para incluir en el reporte

---

## ✅ Resultado esperado final

Si TODAS las pruebas (A, B, C, D) pasan:
- [ ] Toast aparece con mensaje correcto
- [ ] Contenido se puede pegar en Bloc de notas
- [ ] Contenido es completo y correcto
- [ ] Consola muestra `[COPY DEBUG] Clipboard API SUCCESS`
- [ ] NO hay mensajes de error rojo en consola

**Status: ✅ PROBLEMAS RESUELTOS**
