# Runbook — habilitar mascotas desaparecidas

Pasos para poner la feature de mascotas en producción. Los dos primeros los
**tiene que correr una persona**: `CLAUDE.md` y `docs/architecture.md` reservan
las migraciones y el despliegue del backend de producción a un humano, y esto no
es una excepción.

## Qué se despliega

| Pieza | Estado |
| --- | --- |
| Tabla `missing_pets` | migración `0001_premium_calypso.sql`, **aditiva** |
| API `/api/pets/*` | rutas nuevas, no tocan ninguna existente |
| `api/public/pets` | CRUD para integraciones (capacidades `pet:*`) |
| Pestaña "Mascotas" del directorio | frontend |
| Capa 🐾 del mapa | frontend |
| Pestaña "Mascotas" del panel admin | frontend |

## Por qué el orden importa (y por qué es tolerante)

La migración es `CREATE TABLE IF NOT EXISTS` más dos índices. **No altera
ninguna tabla que produccion esté leyendo ahora mismo**, así que:

- Correr la migración ANTES del deploy: la tabla queda vacía e inerte. El
  backend viejo ni la mira. Coste: cero.
- Desplegar el backend ANTES de la migración: `/api/pets/*` devuelve 500 y la
  pestaña de mascotas muestra "No pudimos cargar las mascotas". **El directorio
  de personas no se entera** — se comprobó en staging el 2026-08-10:
  `/api/missing/stats` y `/api/missing` seguían en 200 con el backend nuevo y el
  esquema viejo.

Es decir: no hay un orden que rompa a las personas. El recomendado es
migración → backend → frontend porque minimiza la ventana en la que la pestaña
nueva está visible y rota.

## 1. Migración (HUMANO)

`DATABASE_URL` tiene que apuntar a Neon **directo**, no al endpoint `-pooler`.

Staging primero:

```bash
cd repo/backend && doppler run --project terremotocolombia-web --config stg --command 'MIGRATIONS_DIR=../infra/db/migrations npm run migrate'
```

Producción:

```bash
cd repo/backend && doppler run --project terremotocolombia-web --config prd --command 'MIGRATIONS_DIR=../infra/db/migrations npm run migrate'
```

`MIGRATIONS_DIR` es necesario si lo corres desde `backend/`: el valor por defecto
(`infra/db/migrations`) es relativo al CWD y desde ahí no resuelve.

Es idempotente (se registra en `__drizzle_migrations`) y re-ejecutable. Al
terminar corre además `seedAuth`, que siembra las cuatro capacidades nuevas
(`pet:read`, `pet:create`, `pet:edit`, `pet:delete`). Sin ese seed, la superficie
`api/public/pets` responde 403 a todo — deny-by-default, que es el fallo seguro.

Verifica:

```bash
curl -s https://api.terremotocolombia.co/api/pets/stats
```

Debe devolver `{"stats":{"total":0,"active":0,"found":0,"onMap":0}}`, no un 500.

## 2. Deploy del backend (HUMANO)

```bash
gh workflow run deploy-backend.yml -f confirmar=desplegar
```

## 3. Frontend

Se despliega solo al mergear a `main` (`deploy-frontend.yml` se dispara con
`frontend/**`). No hace falta hacer nada más.

## Rollback

- **Frontend**: revertir el merge y pushear; el deploy es automático.
- **Backend**: re-desplegar el commit anterior con el mismo workflow manual.
- **Tabla**: no hace falta tirarla. Sin código que la lea es inerte y no cuesta
  nada. `DROP TABLE missing_pets` solo si alguien decide abandonar la feature —
  y entonces se pierden los reportes que haya, así que es decisión del
  mantenedor, no un paso de rollback rutinario.

La garantía de que esto no puede ensuciar el conteo de personas es
**estructural**: son tablas distintas, así que ninguna consulta de personas
puede devolver una mascota. Hay tests que lo fijan en
`backend/test/api/pets.test.ts` → "aislamiento respecto al directorio de
PERSONAS".
