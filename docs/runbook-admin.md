# Runbook — Panel de administración

Operación del panel admin (`admin/`): dónde vive, quién entra, cómo se dan de
alta usuarios y cómo se cargan datos hospitalarios. Para arquitectura ver
`docs/architecture.md`; para reglas de despliegue, `CLAUDE.md`.

## Dónde vive

| Entorno | URL | Worker | API que consume |
| --- | --- | --- | --- |
| Producción | admin.terremotocolombia.co | `terremotocolombia-admin` | api.terremotocolombia.co |
| Staging | admin-staging.terremotocolombia.co | `terremotocolombia-admin-staging` | api-staging.terremotocolombia.co |

Producción está detrás de **Cloudflare Access**: antes de ver siquiera el
login del panel, la persona pasa un código OTP enviado a su email, que debe
estar en la allowlist de la app de Access (org
`terremotocolombia.cloudflareaccess.com`). Staging no lleva Access.

## Dos capas de identidad (a propósito)

1. **Cloudflare Access (borde).** Decide quién puede *llegar* al panel.
   Allowlist de emails; OTP; sin contraseñas.
2. **Cuenta del panel (aplicación).** Decide qué puede *hacer* cada quien:
   RBAC por capacidades (`recurso:verbo`), sesión JWT en cookie httpOnly.
   La autorización real vive en el backend (`requireCapability`), deny-by-default.

Un email en Access sin cuenta del panel ve el login y no pasa de ahí; una
cuenta del panel sin email en Access no llega ni al login. **Alta completa =
las dos cosas.**

## Alta de un usuario nuevo

1. **Access**: añadir su email a la política "equipo interno" de la app
   `admin.terremotocolombia.co` (Zero Trust dashboard → Access → Applications,
   o vía API con `CLOUDFLARE_ACCESS_API_TOKEN` de Doppler `prd`).
2. **Panel**: entrar como admin → **Usuarios** → invitar con su email y rol.
   Producción **sí tiene SMTP** (Resend; los cinco secretos `SMTP_*` están en el
   Worker de la API — verificado 2026-08-11 con `wrangler secret list`), así que
   la invitación se envía por correo sola y la respuesta trae `emailSent:true`
   sin `inviteUrl`. Caduca en 72 h. Si `emailSent` viniera `false`, la respuesta
   incluye el **link de activación** para pasarlo por un canal directo.
   Ojo: los secretos de un Worker NO aparecen en `wrangler.jsonc` — mirar la
   config para saber si hay SMTP da un falso negativo; usa `wrangler secret list`.
3. La persona abre el link, fija SU contraseña y queda activa con el rol
   asignado.

### Roles

- `admin` — rol semilla del sistema, todas las capacidades. Inmutable.
- `operaciones-hospitales` — carga y gestión de datos hospitalarios:
  hospitales, pacientes, insumos e importación (más `apikey:manage`, como
  todos los roles). Para personal de captura de datos.
- Roles nuevos: **Roles** → crear, marcando capacidades. Menos es más:
  se puede ampliar después con la misma pantalla o con un grant puntual.

El flag `is_super_admin` (tier por ENCIMA de admin) gobierna solo la réplica
pública SQL (`mirror:manage`) y se asigna a mano en base de datos — no desde
el panel. Hoy lo tiene únicamente el mantenedor.

## Carga de datos hospitalarios

Orden natural en el panel:

1. **Hospitales** → crear el centro (nombre y departamento como mínimo;
   `facilityType: refugio` para albergues/centros de acopio).
2. **Pacientes** → personas localizadas en ese centro
   (`status: hospitalized` o `sheltered` para refugios).
3. **Insumos hospitalarios** → semáforos por categoría (verde/amarillo/rojo),
   necesidades activas, solicitudes de ayuda y bitácora, por hospital.
   Las notas "internas" solo las ve quien tiene capacidad sobre hospitales;
   las públicas salen al sitio.

> **Importación en lote ("Importar pacientes"): FUNCIONA en Workers** (desde
> 2026-08-10). El lote se encola en Cloudflare Queues
> (`terremotocolombia-imports`), el consumidor del propio Worker lo procesa
> (validación + dedupe) y el apply es una máquina de estados idempotente y
> reanudable — un corte a medias nunca duplica pacientes. Un lote que agota
> reintentos queda `failed` con causa y su carta muerta aparece en Auditoría
> (`queue.dead_letter`). Archivos CSV/XLSX: el productor materializa las filas
> antes de encolar (límite de 128 KB por mensaje de Queues).

## Analítica de voluntarios

Página **Analítica de voluntarios** (`/volunteer-analytics`): agregados sin
PII, gated por `volunteer:read` (nav oculta sin la capacidad). El sistema
`admin` la recibe en el seed; otros roles solo con grant manual.

### Verificar en local (compose)

1. Levantar stack: `docker compose up --build` (Postgres + Valkey + API + admin).
2. Migraciones + seed DEMO: el servicio `migrate`/`seed` inserta `DEMO-vol-*`
   que cubren la taxonomía de intenciones.
3. Entrar al panel con el admin local sembrado (`admin@example.org` / la
   contraseña del seed de auth local documentada en compose).
4. Abrir **Analítica de voluntarios**: KPIs + charts + callouts con corpus
   completo. **Actualizar** debe forzar `refresh=1` y refrescar el payload.
5. Vacío: si no hay filas (DB limpia sin seed), la UI muestra estado
   vacío/bloqueado — no gráficos vacíos como “éxito”.

### Staging-first (humano) — no desplegar a main sin esto

1. **Humano**: aplicar migración expand-only de `volunteers*` en Neon
   **staging** (URL directa, no `-pooler`). Ver apply-progress / CLAUDE.md.
2. Opcional: `ALLOW_STAGING_DEMO_SEED=1` + `npm run seed:volunteers-demo` en
   host staging (nunca producción, nunca CI auto).
3. Smoke en `admin-staging.terremotocolombia.co` con un admin que tenga
   `volunteer:read`.
4. Solo entonces merge a `main` (auto-deploy admin+backend). Board de
   producción necesita además migración Neon **production** (paso humano).

## Despliegues del panel

- **Staging**: automático en cada push a `staging` (job `admin` de
  `deploy-staging.yml`).
- **Producción**: automático en cada push a `main` que toque `admin/**`
  (`deploy-admin.yml`; era manual hasta 2026-08-11). Redeploy a mano:
  `gh workflow run deploy-admin.yml`.
- El smoke check de producción pega a `/api/health`, que tiene un **bypass**
  de Access a propósito. No quitar ese bypass.

## Problemas conocidos

- **"Cargando…" varios segundos al entrar**: arranque en frío de Neon
  (la base escala a cero). Se resuelve solo; mantener Neon caliente es una
  decisión de facturación del mantenedor.
- **El dominio "no existe" justo tras un cambio de DNS**: caché negativa del
  resolver local. Esperar unos minutos o vaciar la caché DNS.
- **Login local (desarrollo)**: `COOKIE_SECURE=false` o la cookie de sesión
  no se fija sobre http://localhost.

## Supresión de datos (Ley 1581)

La ciudadanía solicita eliminación en `/solicitar-borrado` del sitio público;
las solicitudes llegan a la pantalla **Supresión de datos** del panel
(capacidades `deletion:read` para verlas — llevan PII del solicitante — y
`deletion:edit` para resolverlas: `pending → resolved | rejected`). Cada
decisión queda en la Auditoría (`deletion-request.edit`).

> Resolver la solicitud en el panel NO borra los datos por sí solo: el
> operador localiza y elimina los registros del solicitante (Desaparecidos,
> Pacientes, etc.) y DESPUÉS marca la solicitud como `resolved`.

Alta en un entorno nuevo: las dos capacidades entran con el seed
(`backend/worker/migrate.ts`), que es un paso humano contra Neon directo.
