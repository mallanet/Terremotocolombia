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
   Producción no tiene SMTP: la respuesta muestra el **link de activación** —
   cópialo y envíaselo por un canal directo. Caduca en 72 h.
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

> **Importación en lote ("Importar pacientes"): todavía NO procesa en
> producción.** La pantalla encola el lote, pero el procesamiento depende de
> transacciones interactivas que fallan en Workers (ver el plan
> `docs/plans/2026-08-10-002-…` → fuera de alcance). Hasta su propio plan,
> la carga es registro a registro por las pantallas CRUD.

## Despliegues del panel

- **Staging**: automático en cada push a `staging` (job `admin` de
  `deploy-staging.yml`).
- **Producción**: manual con confirmación —
  `gh workflow run deploy-admin.yml -f confirmar=desplegar`.
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
