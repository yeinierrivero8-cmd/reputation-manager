# Guía: Cómo Instalar el Widget de Reseñas en tu Sitio

## ¿Qué es el Widget?

Un código simple que muestras tus reseñas en tu sitio web automáticamente.

## Pasos

### 1️⃣ Obtén tu código de negocio
- Inicia sesión en ReputationManager
- Ve a tu negocio
- Busca el código único (ej: `abc123xyz`)
- Cópialo

### 2️⃣ Copia el código del widget
```html
<div id="rm-widget" data-share-link="AQUI_PEGA_TU_CODIGO" data-mode="compact"></div>
<script src="https://reputation-manager-amber.vercel.app/widget.js"></script>
```

### 3️⃣ Reemplaza `AQUI_PEGA_TU_CODIGO`
Ejemplo:
```html
<div id="rm-widget" data-share-link="abc123xyz" data-mode="compact"></div>
<script src="https://reputation-manager-amber.vercel.app/widget.js"></script>
```

### 4️⃣ Pega en tu HTML
- Abre el código HTML de tu sitio
- Busca donde quieras mostrar las reseñas
- Pega todo el código (las 2 líneas)
- Guarda

### 5️⃣ Listo
Las reseñas aparecen automáticamente. ✅

## Opciones

- `data-mode="compact"` — vista compacta (recomendado)
- `data-mode="full"` — vista completa
- `data-reviews="10"` — mostrar 10 reseñas (por defecto 5)

## Soporte
¿Problemas? Contacta con nosotros.
