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
| Ruta propia `/mascotas` | frontend |
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

Tiene que apuntar a Neon **directo**, no al endpoint `-pooler`. Con el pooler
falla: `migrate.ts` pasa `lock_timeout`/`statement_timeout` como parámetros de
arranque y PgBouncer en modo transacción los rechaza.

**Las dos configs NO son simétricas** (comprobado el 2026-08-10):

| Config | Variable | ¿Directa? |
| --- | --- | --- |
| `prd` | `NEON_CONNECTION_STRING` | **sí** — es la que se usa |
| `prd` | `DATABASE_URL` | no, es el `-pooler` |
| `stg` | `DATABASE_URL` | no, es el `-pooler` — **no hay variable directa** |

En staging hay que derivar la URL directa quitándole el `-pooler` al host.
`scripts/migrate-direct.sh` hace eso, **aborta si el host resultante sigue
siendo el pooler**, y nunca imprime la URL (solo el host):

```bash
doppler run --project terremotocolombia-web --config stg --command 'bash scripts/migrate-direct.sh DATABASE_URL'
```

```bash
doppler run --project terremotocolombia-web --config prd --command 'bash scripts/migrate-direct.sh NEON_CONNECTION_STRING'
```

`MIGRATIONS_DIR` es necesario porque el valor por defecto es relativo al CWD; el
script ya lo pone.

Es idempotente (se registra en `__drizzle_migrations`) y re-ejecutable. Al
terminar corre además `seedAuth`, que siembra las cuatro capacidades nuevas
(`pet:read`, `pet:create`, `pet:edit`, `pet:delete`). Sin ese seed, la superficie
`api/public/pets` responde 403 a todo — deny-by-default, que es el fallo seguro.

Verifica:

```bash
curl -s https://api.terremotocolombia.co/api/pets/stats
```

Debe devolver `{"stats":{"total":0,"active":0,"found":0,"onMap":0}}`, no un 500.

**Verifica SIEMPRE con un cache-buster** (`?cb=$RANDOM`). Sin él te responde el
borde con una copia vieja y sacas la conclusión contraria: durante este
despliegue un `status=all` cacheado hizo parecer que el conteo de personas no
cuadraba (3 vs 14) cuando los datos estaban perfectos.

Nota: en `stg` **no existe `ADMIN_PASSWORD`**, así que `requireAdmin` rechaza
todo y los endpoints de moderación (DELETE, restore) no se pueden ejercitar
ahí. Se prueban en local con el stack de compose.

## 2. Deploy del backend

Automático desde 2026-08-11: mergear a `main` un cambio que toque `backend/**`
lo despliega solo (`deploy-backend.yml`). Redeploy a mano:

```bash
gh workflow run deploy-backend.yml --ref main
```

**Mergea a `main` ANTES de un dispatch manual.** El workflow despliega el ref
sobre el que se lanza, y por defecto es `main`. Si lo lanzas sobre una rama y después
alguien lo lanza sobre `main`, el segundo pisa al primero y producción se queda
con el backend de `main` — que si aún no tiene el merge, es el viejo. Pasó
exactamente eso el 2026-08-10: `/api/pets` volvió a dar 404 tras un despliegue
aparentemente correcto. El estado sano es **`main` == lo que corre en
producción** en los dos tiers.

## 3. Frontend

Se despliega solo al mergear a `main` (`deploy-frontend.yml` se dispara con
`frontend/**`). No hace falta hacer nada más.

Entre el merge (frontend) y el botón del backend hay una ventana en la que la
pestaña "Mascotas" existe y `/api/pets` todavía no. No rompe nada: se ve "No
pudimos cargar las mascotas", que es honesto. Para que dure segundos, lanza el
deploy del backend justo después del merge, sin esperar al del frontend.

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
