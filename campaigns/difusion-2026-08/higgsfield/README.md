# Higgsfield — suite creativa (API only)

## Acceso

Este proyecto usa **solo API Key / Secret** (`HF_API_KEY` + `HF_API_SECRET` en `.env`).

| Camino | ¿Sirve con solo API? |
|--------|----------------------|
| REST `platform.higgsfield.ai` + `scripts/higgsfield/cli.py` | **Sí** |
| Plugin MCP `mcp.higgsfield.ai` (OAuth de cuenta Cloud) | **No** — pide login de cuenta dueña; la key sola no autentica el MCP (401) |

No uses “Authenticate” del plugin MCP si no tenés la cuenta Cloud. Generá con el CLI.

## Estado de conexión (API)

- Base: `https://platform.higgsfield.ai`
- Header: `Authorization: Key {HF_API_KEY}:{HF_API_SECRET}`
- Modelo default: `higgsfield-ai/soul/standard`
- Smoke reciente: **auth OK**; si responde `not_enough_credits`, top-up en [cloud.higgsfield.ai](https://cloud.higgsfield.ai) con la cuenta que emitió la key

## CLI

```bash
cd /path/to/terremotocolombia
python3 scripts/higgsfield/cli.py smoke
python3 scripts/higgsfield/cli.py generate \
  --name x-launch-1200x675 \
  --aspect-ratio 16:9 \
  --prompt-file campaigns/difusion-2026-08/higgsfield/prompts/x-launch.txt
```

Salida: `campaigns/difusion-2026-08/higgsfield/out/`

Docs: https://docs.higgsfield.ai/docs

## Plugin Cursor

El error `$schema` del marketplace se mitiga con el plugin local en `~/.cursor/plugins/local/higgsfield` (sin `$schema`). Eso no reemplaza la API: para generar imágenes seguí el CLI.

## Seguridad

- Nunca commits de `.env`
- Si el secret se pegó en un chat, rotá la key en el dashboard y actualizá `.env`
