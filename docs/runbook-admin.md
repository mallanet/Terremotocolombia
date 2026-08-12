# Runbook — Admin Panel

This runbook describes operation of the admin panel (`admin/`). It covers
where the panel runs, who can access it, how a new user gets an account,
and how hospital data is loaded. For architecture, see
`docs/architecture.md`. For deployment rules, see `CLAUDE.md`.

## Where the panel runs

| Environment | URL | Worker | API it uses |
| --- | --- | --- | --- |
| Production | admin.terremotocolombia.co | `terremotocolombia-admin` | api.terremotocolombia.co |
| Staging | admin-staging.terremotocolombia.co | `terremotocolombia-admin-staging` | api-staging.terremotocolombia.co |

Production sits behind **Cloudflare Access**. Before a user sees the panel
login page, the user must enter a one-time passcode (OTP). Cloudflare
Access sends the OTP by email. The user's email must be on the allowlist
of the Access application (organization
`terremotocolombia.cloudflareaccess.com`). Staging has no Access layer.

## Two identity layers (by design)

1. **Cloudflare Access (edge).** This layer decides who can *reach* the
   panel. It uses an email allowlist and an OTP. It does not use
   passwords.
2. **Panel account (application).** This layer decides what each user can
   *do*. It uses role-based access control (RBAC) with capabilities in the
   form `resource:verb`. The session token is a JWT stored in an httpOnly
   cookie. The real authorization check runs in the backend
   (`requireCapability`). The default is deny.

An email on the Access allowlist without a panel account can reach the
login page, but cannot pass it. A panel account without an email on the
Access allowlist cannot reach the login page. **A complete user setup
needs both.**

## How to add a new user

1. **Access**: Add the user's email to the "internal team" policy of the
   `admin.terremotocolombia.co` application. Use the Zero Trust dashboard
   (Access → Applications), or use the API with the
   `CLOUDFLARE_ACCESS_API_TOKEN` secret from Doppler `prd`.
2. **Panel**: Log in as an admin. Go to **Users**. Invite the new user
   with an email address and a role.
   Production **has SMTP** (Resend). The Worker for the API holds the
   five `SMTP_*` secrets. The team verified this on 2026-08-11 with
   `wrangler secret list`.
   The panel sends the invitation by email automatically. The response
   returns `emailSent:true` and no `inviteUrl`.
   The invitation expires after 72 hours.
   If `emailSent` returns `false`, the response includes an **activation
   link**. Send this link to the user through a direct channel.
   Note: Worker secrets do NOT appear in `wrangler.jsonc`. A check of the
   config file alone gives a false negative for SMTP status. Use
   `wrangler secret list` instead.
3. The user opens the link, sets a password, and the account becomes
   active with the assigned role.

### Roles

- `admin` — This is the system seed role. It has all capabilities. It is
  immutable.
- `operaciones-hospitales` — This role loads and manages hospital data:
  hospitals, patients, supplies, and imports. It also has
  `apikey:manage`, like every role. This role is for data-entry staff.
- To create a new role, go to **Roles** and select capabilities. Grant
  fewer capabilities at first. An admin can add more later on the same
  screen, or grant a single capability directly.

The `is_super_admin` flag is a tier ABOVE `admin`. It controls only the
public SQL replica (`mirror:manage`). An operator must set this flag by
hand, directly in the database. The panel cannot set this flag. Today,
only the maintainer has this flag.

## How to load hospital data

Load data in the panel in this order:

1. **Hospitals**: Create the facility. Enter, at minimum, a name and a
   department. Use `facilityType: refugio` for shelters and collection
   centers.
2. **Patients**: Add people located at that facility. Use
   `status: hospitalized`, or `status: sheltered` for shelters.
3. **Hospital supplies**: For each hospital, set a status light per
   category (green, yellow, or red). Record active needs, help requests,
   and log entries. Only a user with capability over hospitals can see
   "internal" notes. "Public" notes appear on the public site.

> **Batch import ("Importar pacientes") WORKS on Workers** (since
> 2026-08-10). The panel places the batch on a Cloudflare Queue
> (`terremotocolombia-imports`). The Worker's own consumer processes the
> batch: it validates the data and removes duplicates. The apply step is
> an idempotent, resumable state machine. A partial failure never creates
> duplicate patients. A batch that uses all its retries becomes `failed`,
> with a cause. Its dead letter appears in the Audit log
> (`queue.dead_letter`). For CSV and XLSX files, the producer builds the
> rows before it places the batch on the queue. Each Queue message has a
> 128 KB limit.

## Panel deployments

- **Staging**: Deployment is automatic on every push to the `staging`
  branch. This runs as the `admin` job in `deploy-staging.yml`.
- **Production**: Deployment is automatic on every push to `main` that
  changes a file under `admin/**`. This runs in `deploy-admin.yml`.
  Before 2026-08-11, this deploy was manual. To redeploy by hand, run
  `gh workflow run deploy-admin.yml`.
- The production smoke check sends a request to `/api/health`. This
  endpoint has a deliberate **bypass** of Access. Do not remove this
  bypass.

## Known issues

- **"Loading…" for several seconds at login**: This happens because
  Neon starts cold. The database scales to zero when idle. The delay
  resolves on its own. Keeping Neon warm is a billing decision for the
  maintainer.
- **The domain shows as "not found" right after a DNS change**: This
  happens because of negative caching in the local resolver. Wait a few
  minutes, or clear the local DNS cache.
- **Local login (development)**: The session cookie does not set over
  http://localhost unless `COOKIE_SECURE=false`.

## Data suppression (Law 1581)

A citizen can request deletion at `/solicitar-borrado` on the public
site. Each request arrives on the **Supresión de datos** (Data
suppression) screen in the panel. A user needs the `deletion:read`
capability to view requests, because requests carry the requester's PII.
A user needs the `deletion:edit` capability to resolve a request:
`pending` changes to `resolved` or `rejected`. The Audit log records
every decision (`deletion-request.edit`).

> Resolving the request in the panel does NOT delete the data by itself.
> The operator must find and delete the requester's records (Missing
> Persons, Patients, and so on). AFTER that, the operator marks the
> request as `resolved`.

Setup in a new environment: Both capabilities come from the seed script
(`backend/worker/migrate.ts`). A human must run this script directly
against Neon.
