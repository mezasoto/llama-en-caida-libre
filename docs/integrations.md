# Integraciones de NASA LlamaLab

No se crean cuentas, bases de datos ni servicios de pago automáticamente. El usuario
ha confirmado que todavía no dispone de Supabase ni de un proveedor de IA.

## Configuración del backend en Azure

| Función | Variables exactas | Dependencia |
| --- | --- | --- |
| Persistencia y lectura | `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Proyecto Supabase existente con `public.telemetry` |
| Ingesta ESP32 | Las anteriores y `IOT_INGEST_TOKEN` | El mismo token privado en el firmware |
| IA principal | `GROQ_API_KEY`; opcional `GROQ_MODEL` | Modelo disponible para esa cuenta; valor actual `openai/gpt-oss-120b` |
| IA alternativa | `GEMINI_API_KEY`; opcional `GEMINI_MODEL` | Interactions API; valor actual `gemini-3.8-flash` |
| NASA NTRS | Ninguna clave | HTTPS a `ntrs.nasa.gov` |

Groq tiene prioridad si están configurados ambos proveedores; un fallo de Groq se
devuelve como error, sin cambiar silenciosamente a otro proveedor. La disponibilidad
real de los modelos y cuotas debe comprobarse con una cuenta válida. No se ha
verificado ninguno de los modelos en vivo. Las peticiones de IA tienen un límite
de espera de 25 segundos; NASA, 12 segundos.

Introduce las claves únicamente como configuración segura del servidor. Nunca
como variables `VITE_*`, en el repositorio, en el chat ni en el firmware salvo el
token de ingesta dedicado. El firmware no necesita la clave de Supabase ni de IA.

## Supabase

La migración existente es
`supabase/migrations/20261022000000_create_telemetry.sql`. No se ha ejecutado en
ningún servicio externo. Crea una tabla, sin sustituir ni borrar bases existentes:

| Columna | Tipo y restricciones |
| --- | --- |
| `id` | bigint identity, clave primaria |
| `device_id` | texto, 1–64 caracteres |
| `temperature_c` | double precision, −100 a 1000 |
| `smoke_ppm` | double precision, 0 a 1 000 000 |
| `flame_detected` | boolean, por defecto false |
| `created_at` | timestamptz, por defecto now() |

Activa RLS y crea índices para fecha y dispositivo. El backend requiere una clave
secreta de servidor autorizada para leer/escribir; una clave pública anónima no
sustituye este requisito. No es necesario desactivar RLS ni abrir escritura pública.

`GET /api/telemetry` lee hasta 100 registros recientes y acepta `device_id` opcional.
`POST /api/telemetry` exige `x-ingest-token` y valida los cuatro campos de entrada.
El frontend nunca escribe directamente a Supabase.

## Wokwi / ESP32

El destino predeterminado del firmware es ahora la URL Azure:
`https://nasa-llamalab-2026-app-dccwa9gqg7eqhmgp.brazilsouth-01.azurewebsites.net/api/telemetry`.
Se puede cambiar con `IOT_API_URL` en el archivo ignorado `iot/secrets.h`.
`IOT_INGEST_TOKEN` debe coincidir con Azure. No se ha generado un token de producción.

Se requiere PlatformIO para compilar y Wokwi con conectividad para ejecutar. No
están disponibles en este entorno; el firmware no se ha compilado ni ejecutado.
Un 201 confirma una inserción; después debe aparecer el registro en la consulta
filtrada por dispositivo. Probar una escritura real requiere autorización sobre
el proyecto elegido. No deben confundirse lecturas históricas de la API con una
conexión activa del simulador. El firmware conserva `setInsecure()` del ejemplo:
no está validado para hardware ni credenciales de producción.

## NASA, interfaz e IA

`GET /api/nasa/search?q=FLEX` consulta NASA realmente. Si falla, la API devuelve
502 y la interfaz identifica las referencias incluidas como fuentes locales.
No presenta el catálogo local como una consulta exitosa. Los fixtures de tests
no se incluyen en el artefacto de despliegue.

La IA recibe gravedad, oxígeno, temperatura, flujo y ventilación validados, más
las últimas cinco lecturas consultadas por el servidor. No confía en telemetría
enviada por el navegador. Para clientes antiguos se mantienen los valores por
defecto de los tres controles adicionales. La síntesis usa el contexto estático
de dos informes; no descarga sus textos completos en cada pregunta.

La escena 3D, gráficos de escenario e inteligencia de misión son representaciones
conceptuales o contenido editorial, no CFD ni predicciones validadas. El dashboard
conserva ejemplos `DEMO-*` identificados como datos de muestra. Los gráficos de
telemetría solo muestran datos devueltos por el backend.

## Evidencia de esta revisión

Base: `c438f6b` (PR #3 fusionado). El usuario informa despliegue exitoso #16 y
frontend/health públicos operativos. No se ha podido repetir esa comprobación:
el proxy de este entorno bloquea Azure y `api.github.com`, y la política activa
sigue sin dominios personalizados. Los permisos necesarios están guardados en el
borrador pero no aplicados. No hay identidad Azure ni credenciales de servicios.

Las pruebas de contratos usan fixtures HTTP explícitos y ejercitan Express
compilado, transformación de NASA, Supabase read/write, autenticación de ingesta,
contexto Groq, errores externos y ausencia de credenciales. Son pruebas locales,
no evidencia de conexión real a NASA, Supabase, Wokwi ni modelos de IA.

Resultados locales de esta revisión con Node 22.23.5: 18 comprobaciones de
contratos aprobadas (19 entradas TAP contando el test contenedor), sin fallos ni
saltos; ambas compilaciones aprobadas; artefacto con dependencias de producción
probado sobre TCP y socket. Chromium verificó los cinco controles, el cuerpo HTTP
real enviado al asistente, mensajes de credenciales ausentes, secciones de misión
y evidencia, navegación, filtro del dashboard y canvas WebGL sin excepciones.
El lint mantiene tres advertencias React existentes y Vite advierte sobre tamaño
de chunks. No hay resultados nuevos de GitHub Actions ni pruebas públicas desde
este entorno para estos cambios.
