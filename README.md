# Llama en caída libre

Panel de demostración para explorar seguridad contra incendios en microgravedad. La biblioteca de experimentos incluida en el frontend es ilustrativa; las lecturas de telemetría se consultan desde Supabase a través del backend.

## Supabase

En el proyecto de Supabase abre **SQL Editor → New query** y ejecuta [`supabase/migrations/20261022000000_create_telemetry.sql`](supabase/migrations/20261022000000_create_telemetry.sql). La tabla activa RLS; las lecturas se escriben desde el backend usando una clave secreta que no debe incluirse en el frontend ni en el firmware.

## Desarrollo local

1. Copia `backend/.env.example` a `backend/.env` y añade la Project URL, la clave secreta de Supabase y un token largo para la ingesta IoT.
2. En una terminal ejecuta `cd backend`, `npm install` y `npm run dev`.
3. Copia `frontend/.env.example` a `frontend/.env.local`. Deja `VITE_API_URL=http://localhost:3001` para el backend local.
4. En otra terminal ejecuta `cd frontend`, `npm install` y `npm run dev`.

`GET /api/health` comprueba el backend y muestra si Supabase está configurado. `GET /api/telemetry` devuelve hasta 100 lecturas recientes. `POST /api/telemetry` inserta una lectura y requiere el encabezado `x-ingest-token`.

Ejemplo del cuerpo de ingesta:

```json
{
  "device_id": "esp32-demo-01",
  "temperature_c": 24.5,
  "smoke_ppm": 120,
  "flame_detected": false
}
```

El frontend actualiza la telemetría cada 10 segundos. `VITE_API_URL` debe apuntar a la raíz de la API, por ejemplo `https://tu-api.onrender.com`, sin añadir `/api`.

## Render

Despliega dos servicios desde este repositorio:

- Backend, tipo **Web Service**, Root Directory `backend`, Build Command `npm install && npm run build`, Start Command `npm start`. Configura `SUPABASE_URL`, `SUPABASE_SECRET_KEY` e `IOT_INGEST_TOKEN` en **Environment**.
- Frontend, tipo **Static Site**, Root Directory `frontend`, Build Command `npm install && npm run build`, Publish Directory `dist`. Configura `VITE_API_URL` con la URL pública del backend y vuelve a desplegar el frontend tras cambiarla.

Nunca subas archivos `.env` ni copies la clave secreta de Supabase a Wokwi, al frontend o al repositorio.