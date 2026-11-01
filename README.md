# ReputationManager — aplicación de reseñas para negocios

MVP en español creado desde cero. Incluye registro/inicio de sesión, gestión de negocios, enlaces públicos únicos para dejar reseñas, calificaciones de 1 a 5 estrellas y panel de reseñas.

## Requisitos
- Node.js 18 o superior
- npm

## Instalación en Windows
1. Descomprime la carpeta.
2. Abre CMD en la carpeta `ReputationManager_FromScratch`.
3. Ejecuta:

```cmd
npm install
npm run install:all
npm run dev
```

4. Abre `http://localhost:5173`.
5. Crea una cuenta y añade tu primer negocio.
6. Copia el enlace público del negocio y ábrelo en otra pestaña para enviar una reseña de prueba.

La API se ejecuta en `http://localhost:5000`.

## Datos
En desarrollo, los datos se guardan en `server/data/db.json`. Haz copias de seguridad de ese archivo. Es un almacenamiento simple para MVP/local; para producción multiusuario se recomienda migrar a una base de datos administrada y configurar `JWT_SECRET` como variable de entorno segura.

## Variables opcionales
- `PORT` — puerto de la API (por defecto 5000)
- `JWT_SECRET` — secreto de JWT; obligatorio cambiarlo antes de desplegar públicamente
- `VITE_API_URL` — URL de la API para el frontend (por defecto `http://localhost:5000/api`)

## Importante
Esta versión implementa reseñas internas de ReputationManager. No finge tener Google, Trustpilot o Facebook conectados. Las reseñas son opiniones de clientes dentro de esta aplicación. Si se despliega públicamente, añade HTTPS, rate limiting, validación anti-spam, políticas de privacidad/retención y base de datos persistente administrada.
