# Activar Groq sin exponer credenciales

## Configuración exacta

En Azure Portal, abre **nasa-llamalab-2026-app → Settings / Configuración →
Environment variables / Variables de entorno → App settings / Configuración de
aplicación**. Agrega o modifica solo:

| Nombre | Valor |
| --- | --- |
| `GROQ_API_KEY` | La clave real de tu cuenta Groq, introducida solo en el campo seguro de Azure |
| `GROQ_MODEL` | `openai/gpt-oss-120b` |

Pulsa **Apply / Aplicar** y confirma el reinicio que solicite Azure. No hace falta
cambiar otras variables, recompilar React, crear recursos, cambiar Free F1 ni
reiniciar otra vez por separado. No introduzcas la clave en el chat o en GitHub.
El backend tiene prioridad Groq sobre Gemini; no hace falta borrar Gemini.

`openai/gpt-oss-120b` se conserva porque el SDK oficial actual de Groq lo declara
compatible con Chat Completions. Su razonamiento resulta adecuado para sintetizar
el contexto científico acotado, pero no garantiza exactitud científica. Fuente:
https://github.com/groq/groq-typescript/blob/main/src/resources/chat/completions.ts
La disponibilidad para una cuenta, sus cuotas y una respuesta real no están
verificadas: deben comprobarse con una clave autorizada. No se habilita facturación.

## Comprobación después de aplicar

1. `/api/health` debe mostrar `aiConfigured: true`, `aiProvider: "groq"` y
   `aiModel: "openai/gpt-oss-120b"`. Esto confirma configuración, no autenticación.
2. En el asistente pregunta «¿Cómo cambia la combustión en microgravedad?» y cambia
   los cinco controles. El backend debe responder a `POST /api/insights` con texto
   y referencias; esa respuesta debe aparecer en la interfaz.
3. Una prueba real de generación es indispensable para declarar Groq operativo.
   No se ejecutó aquí: falta la clave y la red bloquea Azure y Groq.

No necesitas Supabase para generar respuestas. Sin Supabase, el contexto de
telemetría estará vacío; no se fabrican lecturas. Los cinco parámetros del
escenario sí se envían y validan. La síntesis utiliza las dos referencias
incluidas en el código, no una búsqueda científica autónoma.

## Errores seguros

| Caso | HTTP / código |
| --- | --- |
| Sin proveedor configurado | 503 y explicación de variables faltantes |
| Clave rechazada o acceso denegado por Groq | 503 / `AI_AUTH_ERROR` |
| Cuota de Groq agotada | 503 / `AI_RATE_LIMITED`, con `Retry-After` |
| Modelo no encontrado (Groq 404) | 503 / `AI_MODEL_UNAVAILABLE` |
| Límite local de 20 peticiones/hora por IP | 429, con `Retry-After` |
| Timeout del proveedor (25 s) | 504 / `AI_TIMEOUT` |
| Respuesta vacía, inválida o error remoto | 502 y código seguro |

Los errores del proveedor nunca se copian a respuestas ni registros. La clave
solo viaja en el encabezado Authorization del backend hacia `api.groq.com`.
No se incluye en el contexto del modelo, en variables `VITE_*` ni en commits.

## Supabase

La migración existente `supabase/migrations/20261022000000_create_telemetry.sql`
crea `public.telemetry` con identidad, dispositivo, temperatura, humo, llama y
fecha, índices y RLS. No borra ni reemplaza tablas. Antes de usarla sobre una base
existente se debe revisar su esquema; `IF NOT EXISTS` no adapta una tabla previa.
No se ejecutó SQL ni se creó un proyecto.

El backend requiere `SUPABASE_URL` y `SUPABASE_SECRET_KEY`, y para ingesta también
`IOT_INGEST_TOKEN`. RLS permanece activo; la clave secreta de servidor debe tener
los permisos necesarios. El frontend usa solamente `/api/telemetry` desde el
mismo origen y no necesita claves Supabase. Más detalles: [integrations.md](integrations.md).

## Validación de esta corrección

Base: `fcae252`, PR #4 fusionado. Node 22.23.5: instalación limpia en ambos
componentes, compilaciones Express/React y 32 entradas de test aprobadas
(incluido el contenedor de contratos), sin fallos ni saltos. Se verificaron
los cinco parámetros, errores de autenticación/cuota/modelo, respuesta inválida,
cancelación real de una petición pendiente por señal de timeout, límite local
y ausencia de credenciales en errores y logs. Estas pruebas usan fixtures,
no Groq real. El paquete de producción pasó por TCP y socket. Chromium mostró
la respuesta de prueba y los errores seguros en el asistente; navegación al
dashboard y canvas WebGL funcionaron sin excepciones JavaScript.

Azure no está accesible desde este entorno: el proxy rechaza CONNECT con 403.
La API de GitHub también está bloqueada y no hay identidad Azure ni clave Groq
configuradas. No se modificó Azure, no se reinició el servicio y no se ejecutó
una solicitud real a Groq. La documentación web de Groq estaba bloqueada; la
compatibilidad del modelo se comprobó en el código oficial del SDK enlazado.
