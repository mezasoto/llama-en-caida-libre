# Llama en caída libre

Dashboard interactivo para explorar seguridad contra incendios en microgravedad. Las referencias NASA se consultan en NASA NTRS; la telemetría del ESP32/Wokwi se consulta desde Supabase a través del backend.

## Supabase

En el proyecto de Supabase abre **SQL Editor → New query** y ejecuta [`supabase/migrations/20261022000000_create_telemetry.sql`](supabase/migrations/20261022000000_create_telemetry.sql). La tabla activa RLS; las lecturas se escriben desde el backend usando una clave secreta que no debe incluirse en el frontend ni en el firmware.

## Desarrollo local

1. Copia `backend/.env.example` a `backend/.env` y añade la Project URL, la clave secreta de Supabase y un token largo para la ingesta IoT.
2. En una terminal ejecuta `cd backend`, `npm install` y `npm run dev`.
3. Copia `frontend/.env.example` a `frontend/.env.local`. Deja `VITE_API_URL=http://localhost:3001` para el backend local.
4. En otra terminal ejecuta `cd frontend`, `npm install` y `npm run dev`.

`GET /api/health` comprueba el backend y muestra si Supabase está configurado. `GET /api/telemetry` devuelve hasta 100 lecturas recientes. `POST /api/telemetry` inserta una lectura y requiere el encabezado `x-ingest-token`.

`GET /api/nasa/search?q=FLEX%20microgravity` busca hasta 10 registros en el catálogo público NASA NTRS y devuelve sus metadatos, abstracts y enlaces. `POST /api/insights` combina una pregunta, los controles del escenario, las últimas lecturas simuladas y el contexto de dos informes NTRS. El modelo visual Three.js es cualitativo y no es CFD ni está validado para predicción de incendios.

`POST /api/insights` genera una síntesis acotada a dos referencias NASA NTRS, los controles actuales de la escena y las últimas lecturas Wokwi. Usa Gemini Developer API con el modelo por defecto `gemini-2.5-flash`. Configura `GEMINI_API_KEY` en el backend para activarla; `GEMINI_MODEL` es opcional. Una lista permitida en el servidor rechaza preguntas que no mencionen combustión/microgravedad, seguridad contra incendios espaciales, fuentes NASA FLEX/NTRS o telemetría Wokwi. La clave nunca se envía al navegador. El asistente debe diferenciar datos publicados, modelo conceptual y telemetría simulada; sus respuestas no son recomendaciones operativas.

El nivel gratuito de Gemini está sujeto a cuotas que Google puede cambiar, y su política indica que el contenido puede usarse para mejorar productos. No envíes datos personales, secretos de misión ni información sensible al asistente.

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

- Backend, tipo **Web Service**, Root Directory `backend`, Build Command `npm install && npm run build`, Start Command `npm start`. Configura `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `IOT_INGEST_TOKEN` y, para habilitar el asistente gratuito, `GEMINI_API_KEY` en **Environment**. `GEMINI_MODEL` puede establecerse para elegir otro modelo disponible en tu cuota.
- Frontend, tipo **Static Site**, Root Directory `frontend`, Build Command `npm install && npm run build`, Publish Directory `dist`. Configura `VITE_API_URL` con la URL pública del backend y vuelve a desplegar el frontend tras cambiarla.

Nunca subas archivos `.env` ni copies la clave secreta de Supabase a Wokwi, al frontend o al repositorio.

## Simulador Wokwi (ESP32)

El proyecto de firmware está en `iot/`. Sus potenciómetros y botón generan **entradas ilustrativas**, no mediciones de sensores físicos. Cada 10 segundos el ESP32 simulado envía una lectura por HTTPS a Render; el backend la valida y la guarda en Supabase.

1. Instala la extensión **PlatformIO IDE** en VS Code si todavía no está instalada.
2. En una ventana de VS Code, abre la carpeta `iot` como proyecto.
3. Copia `secrets.example.h` a `secrets.h` y reemplaza el texto de ejemplo por el mismo `IOT_INGEST_TOKEN` configurado en Render. `iot/secrets.h` está ignorado por Git.
4. Compila el entorno `esp32dev` desde PlatformIO (`PlatformIO: Build` o `pio run`). Wokwi necesita el firmware compilado antes de iniciar.
5. Ejecuta **Wokwi: Start Simulator** desde la paleta de comandos. La extensión usa `diagram.json` y `wokwi.toml` de la carpeta `iot`.
6. Mueve el potenciómetro de temperatura o humo y presiona el botón rojo para simular una llama. El monitor serial muestra el código HTTP; `201` indica que la lectura se guardó. Revisa `/api/telemetry` o la tabla `public.telemetry` en Supabase.

El ejemplo usa `setInsecure()` para simplificar HTTPS durante la simulación. No uses esta configuración en hardware real sin reemplazarla por validación del certificado TLS. El token se incluye en el firmware, así que usa este ejemplo solo con el token de demostración y no publiques `secrets.h`.