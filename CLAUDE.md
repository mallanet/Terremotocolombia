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

Las **tres piezas** se despliegan solas en push a `main`, cada una con su
filtro de rutas: `deploy-frontend.yml` (`frontend/**` +
`config/deployment.config.json`), `deploy-admin.yml` (`admin/**`) y
`deploy-backend.yml` (`backend/**`, `infra/db/**`,
`config/deployment.config.json`). No hay paso de aprobación: `main` **es**
producción. Un commit es un despliegue a un sitio que usa gente buscando a
familiares. (Backend y admin eran manuales con confirmación hasta el
2026-08-11; el mantenedor quitó ambas puertas.)

**Nunca por iniciativa propia** (requieren un humano):

- correr migraciones (`backend/worker/migrate.ts`) — no las corre CI ni ningún
  deploy, y apuntan a Neon **directo**, no al endpoint `-pooler`. Un push a
  `main` despliega CÓDIGO; el esquema es siempre un paso aparte.
- tocar secretos en Doppler o tokens de Cloudflare
- cambiar registros DNS, DNSSEC o reglas de WAF de la zona

## Dónde corre esto de verdad

**Dos entornos.** Lo que pruebes va a staging primero.

| | Producción (`main`) | Staging (`staging`) |
| --- | --- | --- |
| Web | terremotocolombia.co | staging.terremotocolombia.co |
| API | api.terremotocolombia.co | api-staging.terremotocolombia.co |
| Admin | admin.terremotocolombia.co | admin-staging.terremotocolombia.co |
| Worker web | `terremotocolombia-web` | `terremotocolombia-web-staging` |
| Worker API | `terremotocolombia-api` | `terremotocolombia-api-staging` |
| Worker admin | `terremotocolombia-admin` | `terremotocolombia-admin-staging` |
| Base de datos | rama Neon `production` | rama Neon `staging` |
| Secretos | Doppler config `prd` | Doppler config `stg` |
| Despliegue frontend | automático al pushear | automático al pushear |
| Despliegue backend | automático al pushear (`deploy-backend.yml`, filtro de rutas) | automático |
| Despliegue admin | automático al pushear (`deploy-admin.yml`, filtro `admin/**`) | automático |

Ambos entornos comparten `wrangler.jsonc` (bloque `env.staging`) a propósito: si
se configuran en sitios distintos dejan de parecerse, y un staging que no se
parece a producción no prueba nada. El panel admin sigue el mismo patrón
(`admin/wrangler.jsonc`); su Worker no lleva secretos de runtime — el BFF solo
conoce `EMERGENCY_API_URL` y la sesión es el JWT del backend en cookie httpOnly.

El panel de **producción** está además detrás de **Cloudflare Access** (org
`terremotocolombia.cloudflareaccess.com`, OTP por email contra una allowlist
de correos del equipo): nadie llega ni al login del panel sin pasar el borde.
Hay una app de **bypass solo para `/api/health`**, para que el smoke check de
`deploy-admin.yml` siga viendo 200 — no la quites. Access se gestiona por su
API con un token dedicado (`CLOUDFLARE_ACCESS_API_TOKEN` en Doppler `prd`),
FUERA del módulo OpenTofu. Alta de un teammate = añadir su email a la política
de la app + invitarlo desde /users del panel. `admin-staging` NO lleva Access
(lo protege solo el login propio del panel, y su base es la rama staging).

| Pieza | Estado |
| --- | --- |
| Admin | **desplegado** en ambos entornos (desde 2026-08-10) |
| Worker de colas (BullMQ/Valkey) | **sin desplegar** en ningún entorno |

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
- **Turnstile está ACTIVO en ambos entornos** (verificado 2026-08-11 con
  `wrangler secret list` y con un envío real de navegador en staging y en
  producción). `TURNSTILE_SECRET_KEY` está en el Worker de la API y la site key
  pública sí llega al bundle del frontend.
  **Consecuencia para código nuevo:** todo formulario público que escriba DEBE
  mandar `turnstileToken` (patrón canónico: `useTurnstile()` + `getToken()` por
  submit, ver `components/features/contacts/ContactForm.tsx`). Un `POST` sin
  token responde **403** — que es exactamente como se rompieron en su día todos
  los reportes de personas desaparecidas: el secreto puesto en el Worker sin que
  la site key llegara al bundle. Si alguna vez hay que rehacer ese ciclo: primero
  confirmar la site key en el bundle, **después** reponer el secreto.
- **Bot Fight Mode está apagado** en la zona: inyectaba su script y chocaba con la
  CSP del frontend.
- **`wrangler.jsonc` no debe declarar `routes`.** Los dominios propios se adjuntan
  por la API de cuenta. Al declarar `routes`, wrangler llama además a
  `/zones/{id}/workers/routes`, para lo que el token de cuenta no tiene permiso, y
  el fallo aborta el deploy **después** de subir el código y **antes** de promover
  la versión: el Worker se queda sirviendo la build anterior y el comando parece
  casi correcto.
- **Jobs de fondo: portados a Cloudflare casi por completo** (plan en
  `docs/plans/2026-08-10-002-…`, estado por unidad en `docs/runbook-fase0.md`).
  Corren en Workers: sync de sismos y geocode (Cron Triggers), publicación de
  necesidades (Queues + DLQ persistido en `audit_log`) y la **importación de
  pacientes en lote** (cola `terremotocolombia-imports`; sus transacciones
  interactivas se reescribieron como máquina de estados idempotente — el apply
  usa claims condicionales + id de paciente determinista por fila y es
  reanudable tras un corte sin duplicar pacientes). `services/roles.ts` se
  reescribió igual (create/edit de roles fallaba en Workers). Sigue inerte el
  sync de fuentes externas (U5) — sin fuentes `ENABLE_*` habilitadas no hay
  nada que sincronizar. El worker BullMQ de compose queda intacto (R5);
  `scripts/verify-jobs.sh [staging|production]` verifica frescura sin
  escribir nada.
- **Hay bindings de Hyperdrive y una base D1 creados pero SIN USAR.**
  `backend/wrangler.jsonc` declara un binding de Hyperdrive que hoy no se lee.
  Se intentó y fue contraproducente: el driver de Workers es el HTTP de Neon,
  que necesita una URL de Neon de verdad, y al inyectar la cadena local de
  Hyperdrive **fallaban casi todas las consultas**. La D1 se creó al evaluar
  "todo en Cloudflare" y no tiene ni una línea de código detrás.
  **No los actives suponiendo que están a medio cablear** — están apagados a
  propósito. Quitarlos o hacerlos funcionar es decisión del mantenedor.
- **El rate limit corre degradado.** Sin `VALKEY_URL`, el limitador del backend
  cae a memoria por isolate en vez de compartido. En Workers, con muchos
  isolates, eso es bastante más permisivo de lo que sugiere el número. El rate
  limit del borde (Cloudflare) sí es real.

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

**Resuelto (2026-08-11):** el job `content audit` de CI está en verde. Las dos
causas del rojo histórico se cerraron con decisión del mantenedor: los assets de
marca de Mallanet ya estaban allowlisteados, y el chequeo de historial git
(>50 commits, pensado para un fork recién plantillado) se retiró tras verificar
a mano que el historial es todo propio — ahora está gateado por un marcador
(`scripts/content-audit/.content-audit-fresh`) que este repo no tiene, así que
se salta solo. Las reglas de PII/secretos/crisis previa siguen activas y un
hallazgo nuevo del audit sigue siendo bloqueante: investígalo, no lo
allowlistees sin el mantenedor.

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
admin/wrangler.jsonc             Config del Worker del panel admin (sin secretos)
admin/open-next.config.ts        Adaptador Next -> Workers del panel

.github/workflows/deploy-frontend.yml   Automático en push a main (con filtro de rutas)
.github/workflows/deploy-backend.yml    Automático en push a main (backend/infra-db/config)
.github/workflows/deploy-admin.yml      Automático en push a main (filtro admin/**)
.github/workflows/ci.yml                typecheck + build + content audit

docker-compose.prod.yml          Camino ALTERNATIVO (VPS). No es producción hoy.
docs/deploy-vps.md               Runbook de ese camino alternativo
docs/architecture.md             Arquitectura (actualízalo si cambias algo real)
docs/DESIGN.md                   Sistema de diseño / tokens de marca
AGENTS.md                        Convenciones de código
```

Si algo aquí choca con `AGENTS.md` en una tarea de código, gana `AGENTS.md`. Este
fichero manda en cómo se despliega y qué no se toca sin un humano.
