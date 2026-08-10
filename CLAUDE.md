# CLAUDE.md — entrypoint para agentes

Este repo **ya no es la plantilla genérica**: es el **despliegue en producción**
de **terremotocolombia.co** (Terremoto Colombia 2026, Mallanet.org), sirviendo
tráfico real ahora mismo.

Nació como fork de una plantilla pública de respuesta a desastres, y buena parte
del código sigue siendo genérico. La diferencia importante para ti: la identidad
ya está definida, el standup ya ocurrió, y **lo que empujes a `main` sale a
producción**. Si buscas las convenciones de código (endpoints, DDD de
integraciones, Drizzle, reglas ESLint), lee **`AGENTS.md`**.

## Lo primero: empujar a `main` DESPLIEGA

`.github/workflows/deploy-frontend.yml` se dispara **solo** en cada push a `main`
que toque `frontend/**` o `config/deployment.config.json`. No hay paso de
aprobación. Un commit al frontend es un despliegue a un sitio que usa gente
buscando a familiares.

El **backend NO** se despliega solo: `deploy-backend.yml` es manual
(`workflow_dispatch`) y exige escribir `desplegar`. Es deliberado — la API
comparte base de datos con lo que ya está sirviendo.

**Nunca por iniciativa propia** (requieren un humano):

- desplegar el backend
- correr migraciones (`backend/worker/migrate.ts`) — no las corre CI, y apuntan
  a Neon **directo**, no al endpoint `-pooler`
- tocar secretos en Doppler o tokens de Cloudflare
- cambiar registros DNS, DNSSEC o reglas de WAF de la zona

## Dónde corre esto de verdad

| Pieza | Dónde | Nombre |
| --- | --- | --- |
| Frontend | Cloudflare Workers (`@opennextjs/cloudflare`) | `terremotocolombia-web` |
| Backend API | Cloudflare Workers (Express envuelto, sin reescribir) | `terremotocolombia-api` |
| Base de datos | **Neon Postgres** (externo), endpoint `-pooler` | proyecto `cool-sea-70146941` |
| Admin | construido en CI, **sin desplegar** | — |
| Worker de colas (BullMQ/Valkey) | **sin desplegar** | — |

`backend/src/worker.ts` envuelve la app de Express con `httpServerHandler` de
`cloudflare:node`; la app **no se reescribió**. Ver `backend/wrangler.jsonc` y
`frontend/wrangler.jsonc`.

> **`docker-compose.prod.yml` y `docs/deploy-vps.md` NO describen lo que está en
> producción hoy.** Siguen siendo un camino alternativo válido (VPS + Caddy +
> Postgres/Valkey propios), y de hecho el único donde funciona todo el sistema
> —incluidas colas y transacciones—, pero hoy no es lo que sirve el sitio.

La zona de Cloudflare (DNS, anti-suplantación, TLS, WAF, cache, rate limit) se
gestiona con un módulo de OpenTofu que vive **fuera de este repo**, en
`~/Colombia/infra/cloudflare`.

## Secretos: Doppler, no `.env`

Fuente única de verdad: **Doppler**, proyecto `terremotocolombia-web`, config
`prd`. En producción no se usan ficheros `.env`.

```bash
doppler run --project terremotocolombia-web --config prd -- <comando>
```

Dos tokens de Cloudflare, con permisos **complementarios** — ninguno basta solo:

| Secreto | Sirve para |
| --- | --- |
| `CLOUDFLARE_API_TOKEN_COLOMBIA_SCOPED` | zona: DNS, settings, rulesets, DNSSEC |
| `CLOUDFLARE_ACCOUNT_API_TOKEN` | cuenta: Workers, Pages, R2, Turnstile |

GitHub Actions solo conoce `DOPPLER_TOKEN`; el resto lo inyecta `doppler run` en
el runner.

## Limitaciones conocidas (no son bugs a "arreglar" sin pensar)

- **Sin transacciones interactivas en Workers.** El driver ahí es el HTTP de Neon.
  Los 8 `db.transaction(...)` de `services/roles.ts` y
  `services/patient-imports/*` **fallan en Workers**; funcionan bajo Node/compose.
  Motivo: en Workers un socket TCP pertenece a la petición que lo abrió, así que
  un pool con estado no sirve.
- **Turnstile está desactivado.** Se quitó `TURNSTILE_SECRET_KEY` del Worker de la
  API porque el bundle del frontend no llevaba la site key pública y **todos** los
  reportes de personas desaparecidas fallaban con 403. Las escrituras públicas no
  tienen prueba de humanidad ahora mismo; siguen el WAF y el rate limit de
  Cloudflare. Para reactivarlo: primero confirmar que la site key llega al bundle,
  **después** reponer el secreto. En ese orden, o se rompen los reportes otra vez.
- **Bot Fight Mode está apagado** en la zona: inyectaba su script y chocaba con la
  CSP del frontend.
- **`wrangler.jsonc` no debe declarar `routes`.** Los dominios propios se adjuntan
  por la API de cuenta. Al declarar `routes`, wrangler llama además a
  `/zones/{id}/workers/routes`, para lo que el token de cuenta no tiene permiso, y
  el fallo aborta el deploy **después** de subir el código y **antes** de promover
  la versión: el Worker se queda sirviendo la build anterior y el comando parece
  casi correcto.
- **`admin/` y el worker de colas no están desplegados.**

## Reglas de seguridad (sin excepción)

- **Nunca commitees `.env`** ni ningún `.env.*` real. `.env.example` es el único
  que se commitea, y solo con placeholders obviamente falsos.
- **Nunca commitees datos reales de una crisis.** Ni en código, ni en fixtures, ni
  en tests, ni en docs, ni en un issue o PR. Nombres de personas, cédulas,
  teléfonos, direcciones privadas, notas médicas o fotos reales de afectados no
  van a este repo bajo ninguna circunstancia. Ver `AGENTS.md` → "Seguridad y
  privacidad".
- **Nada de datos de prueba en producción.** La base de Neon es real. Si necesitas
  verificar un endpoint de escritura, bórralo inmediatamente después y déjalo
  dicho. `missing_persons` no es un sitio donde dejar filas `test`.
- **Política de no-datos-reales en seeds/fixtures.** `backend/src/seed/` genera
  datos SINTÉTICOS con prefijo `DEMO-`, aborta si `NODE_ENV=production` o si
  `DATABASE_URL` no apunta a un host local, y aborta si ya hay filas no-demo.
  Cualquier fixture nuevo sigue el mismo patrón.
- **No inventes identidad.** Dominios, emails, teléfonos, nombre de organización o
  coordenadas fuera de `config/deployment.config.json`/Doppler son un bug.
  Ojo: **no controlamos** `terremotocolombia.app`, `.com` ni `.org` — los
  registraron terceros el mismo día. El dominio bueno es **`.co`**.

## Estado del standup

Los cinco `.claude/skills/disaster-*` describen el standup inicial de un fork.
**Aquí ya ocurrió**; no los vuelvas a correr sobre este repo salvo que sepas
exactamente por qué.

| Skill | Estado |
| --- | --- |
| `disaster-configure` | hecho (`config/deployment.config.json` con valores reales) |
| `disaster-brand` | hecho (identidad Mallanet, favicon, OG) |
| `disaster-secrets-bootstrap` | sustituido por Doppler |
| `disaster-deploy-vps` | **no usado** — se desplegó en Cloudflare Workers |
| `disaster-content-audit` | ver abajo |

**Decisión abierta:** el job `content audit` de CI está en rojo. Prohíbe `.png` y
SVGs fuera de `frontend/public|app`, pero el repo ahora lleva legítimamente los
assets de marca de Mallanet en `brand/` y `docs/design/brand/`. La regla se
escribió cuando esto era una plantilla genérica que no debía llevar la identidad
de nadie. **No la ablandes por tu cuenta**: es decisión del mantenedor.

## GEO / SEO (buscadores de IA)

Skill vendored en `.claude/skills/geo/` (upstream:
https://github.com/zubair-trabzada/geo-seo-claude). Guía: `docs/geo/README.md`.

- Comandos: `/geo audit <url>`, `/geo quick`, `/geo schema`, `/geo llmstxt`, …
- Target: `https://terremotocolombia.co`.
- Política robots: bloquear bots de *entrenamiento* de IA está bien; no
  "arreglarlo" abriendo GPTBot/ClaudeBot. Ver `frontend/app/robots.ts`.
- Entregable de audit: `docs/geo/audit-YYYY-MM-DD.md`.

## Dónde mirar

```text
config/deployment.config.json   Identidad del despliegue (fuente de verdad)
.neon                            Contexto de Neon (org + proyecto, sin secretos)

frontend/wrangler.jsonc          Config del Worker del frontend
frontend/open-next.config.ts     Adaptador Next -> Workers
frontend/scripts/                codegen (copia deployment.config.json, logo)
backend/wrangler.jsonc           Config del Worker de la API (alias, nodejs_compat)
backend/src/worker.ts            Envoltura de Express para Workers
backend/src/db/index.ts          Driver según runtime (Neon HTTP vs node-postgres)
backend/src/shims/               Sustitutos de módulos que no corren en Workers

.github/workflows/deploy-frontend.yml   Automático en push a main (con filtro de rutas)
.github/workflows/deploy-backend.yml    MANUAL, con confirmación
.github/workflows/ci.yml                typecheck + build + content audit

docker-compose.prod.yml          Camino ALTERNATIVO (VPS). No es producción hoy.
docs/deploy-vps.md               Runbook de ese camino alternativo
docs/architecture.md             Arquitectura (actualízalo si cambias algo real)
docs/DESIGN.md                   Sistema de diseño / tokens de marca
AGENTS.md                        Convenciones de código
```

Si algo aquí choca con `AGENTS.md` en una tarea de código, gana `AGENTS.md`. Este
fichero manda en cómo se despliega y qué no se toca sin un humano.
