# Optional Module Registry

> **Status notice**
>
> This document describes the docker-compose path. In this path, a BullMQ
> worker with Valkey processes the queue.
>
> Production (Cloudflare Workers) runs neither the BullMQ worker nor Valkey.
> This gap affects two modules today: hub federation and external-source
> sync. For these two modules, nothing consumes the queue in production. A
> queued job for either module stays unprocessed.
>
> Needs publication (`POST /api/needs`) and patient import (manual and OCR)
> now work in a different way. Since 2026-08-10, both use Cloudflare Queues
> in production. Both are live in production. Both process jobs correctly.
> See [`architecture.md`](architecture.md) → "Workers and queues" for that
> path.
>
> The walkthroughs below for needs publication and patient import still
> describe the correct logic for those two modules. Only the queue
> mechanism is different in production.

By default, this template turns off every third-party integration. Each
integration has its own `ENABLE_*` flag in `.env.example`. You turn on an
integration with its flag.

The full template works without any of these modules. This includes the
map, reports, hospitals and shelters, and the admin panel.

Turn on only the modules you need. Each flag is a decision with its own
vendor and compliance surface. A flag is not a free checkbox.

The four current modules:

| Flag | What it does | Vendor/surface |
|---|---|---|
| `ENABLE_RESPONSEGRID` | Merges ResponseGrid into `/api/acopio` and enables needs publication | Third-party public API (ResponseGrid) |
| `ENABLE_HUB_FEDERATION` | Syncs reports with sibling deployments of the same template, plus an optional public SQL replica | Your own sibling infrastructure, or an external data consumer |
| `ENABLE_PATIENT_OCR` | Extracts patient records from hospital-list photos or PDFs, through a vision (VL) provider | Third-party API that receives images with PII and health data |
| `ENABLE_EXAMPLE_SOURCE` | Example sync source (synthetic fixture, no network calls) — the pattern for your real source | None (fixture inside the repository) |

---

## `ENABLE_RESPONSEGRID`

`GET /api/acopio` is always mounted. It serves a static list of official
collection centers for this earthquake, from
`modules/acopio/infrastructure/static/`, plus citizen `shelter` reports
from the map.

When this flag is `true`, the endpoint also merges the
[ResponseGrid](https://responsegrid.app) directory. This flag also enables
needs publication (`/api/needs`). The browser never calls ResponseGrid
directly.

**Endpoints:**

- `GET /api/acopio` — always mounted. Static official list, citizen
  shelter reports, and ResponseGrid when the flag is on.
- `POST /api/needs` and `GET /api/needs/status/{jobId}` — mounted only
  when the flag is on. `POST` returns `202 { queued: true, jobId }`; callers
  must poll the status endpoint until `completed` or `failed` before showing
  a terminal result. Cloudflare Queue jobs use the existing `audit_log` table
  for that minimal status record; the submitted need and contact data are not
  copied into the public status record.

**Required variables** (only when `ENABLE_RESPONSEGRID=true`):

- `RESPONSEGRID_API_URL` — the base URL of the ResponseGrid public API.
- `RESPONSEGRID_EMERGENCY_SLUG` — the identifier for your emergency or
  instance in ResponseGrid.
- `RESPONSEGRID_API_KEY` — required only if you plan to publish needs. You
  do not need this key only to read the directory. Without this key,
  `POST /api/needs` returns `503` instead of failing in a confusing way.

**Vendor and compliance surface:** You depend on the availability and
terms of service of ResponseGrid. Needs publication sends an `author`
field (the reporter's contact information) to a third party. The server
marks this field `verified: false`. Review ResponseGrid's data policy
before you turn on publication.

## `ENABLE_HUB_FEDERATION`

This flag controls two related but independent capabilities.

1. **Report federation** (`backend/worker/hub/`). The worker polls a
   central hub, in read-only mode, for five record types:
   `missing_person`, `checkin`, `help_request`, `help_offer`, and
   `damaged_building`. The worker syncs these records into your own
   `hub_*` tables. The worker excludes your own sources, listed in
   `HUB_OWN_SOURCES`. This exclusion stops the worker from re-ingesting
   data that you already published. It also prevents an echo loop between
   sibling instances of the same template.
2. **Public SQL replica** (optional). This capability uses
   `backend/src/services/hub-credentials.ts` and its router in
   `public-api`. A second, read-only Postgres database receives data
   through logical replication. This replication sends only the columns
   listed in `HUB_PUBLIC_COLUMNS`. This allowlist never includes direct
   PII: it can include person names, but never documents, medical notes,
   or contact information. A sibling deployment can then read aggregated
   data from this replica. A super admin issues and revokes credentials
   per consumer. This action requires the `mirror:manage` permission,
   which requires `users.is_super_admin`. A normal admin account is not
   enough. This capability degrades on its own to `503` when its
   configuration is missing. The missing configuration is usually
   `HUB_ADMIN_DATABASE_URL` and the other hub Postgres and firewall
   variables. The code does not tie this capability strictly to the
   `ENABLE_HUB_FEDERATION` flag. This document groups the two capabilities
   together for one reason. Both share the same underlying decision: do
   you want to federate with other instances.

**Required variables** (only when `ENABLE_HUB_FEDERATION=true`):

- `HUB_BASE_URL` — the URL of the central hub you will read from.
- `HUB_PAGE_LIMIT` — the page size for polling. This variable is optional
  and has a default value.
- `HUB_OWN_SOURCES` — a comma-separated list of your own source IDs. This
  list stops the worker from re-ingesting your own data.
- `HUB_PUBLIC_HOST`, `HUB_DB_NAME`, `HUB_ADMIN_DATABASE_URL` — required
  only if you will also expose your own public replica (capability 2).

**Vendor and compliance surface:** This capability shares data between
organizations. Before you turn it on, confirm three things:

1. Which instance is the source of truth for each piece of data.
2. What happens if one of the two instances goes down.
3. Exactly which columns you will allow in the public replica, if you
   expose one.

The explicit allowlist in `HUB_PUBLIC_COLUMNS` is intentional. Adding a
new table to the hub does not expose that table automatically.

## `ENABLE_PATIENT_OCR`

This flag enables patient-record extraction from hospital-list images and
PDFs. The extraction uses a vision (VL) provider that is compatible with
the OpenAI API. The default provider is MiniMax.

Without this flag, the image-import route returns `501`. The manual
import flow (CSV or text) always works, whether this module is on or off.

**Required variables** (only when `ENABLE_PATIENT_OCR=true`):

- `MINIMAX_API_KEY` — the credential for the vision provider.
- `MINIMAX_OCR_BASE_URL`, `MINIMAX_OCR_MODEL` — the endpoint and the
  model.
- `MINIMAX_OCR_MAX_TOKENS`, `MINIMAX_OCR_TIMEOUT_MS`,
  `MINIMAX_OCR_PROMPT` — optional variables, each with a default value.

**Vendor and compliance surface — this is the most sensitive of the four
modules.** This module sends images to a third-party API. These images
can contain names, identity documents, and medical notes. Before you turn
on this flag, complete these three checks:

1. Confirm that your chosen OCR provider has a data-processing agreement
   that is adequate for health data in your jurisdiction.
2. Know that extracted rows enter staging tables (`patient_imports` and
   `patient_import_rows`) with a `needs_review` status. The system never
   applies these rows automatically. A human must confirm each row before
   it reaches `hospital_patients`. Do not change this behavior without a
   documented reason.
3. Know that the system never exposes the raw identity document in public
   responses. Deduplication uses an HMAC hash
   (`PATIENT_DOCUMENT_HASH_SECRET`), never the plain-text document
   number.

## `ENABLE_EXAMPLE_SOURCE` — and how to add your own real source

This flag enables `backend/worker/sync/sources/example-source.ts`. This
adapter makes no network calls. It serves three synthetic records
(`Persona Ejemplo Uno`, `Persona Ejemplo Dos`, `Persona Ejemplo Tres`)
from a fixture inside the file itself. This adapter exists only to give
this document one full, working example, without a dependency on a real
third party.

The sync engine (`backend/worker/sync/engine.ts`) does not know where a
record comes from. The engine only knows the canonical shape,
`ExternalPerson` (defined in `backend/worker/sync/types.ts`). The engine
handles everything else: upsert, deduplication, retries, and rate
limiting. An adapter's only job is to fetch and normalize data.

### Walkthrough: build a real adapter from the example

1. **Copy the file.** Copy `backend/worker/sync/sources/example-source.ts`
   to `backend/worker/sync/sources/<your-source>.ts`.
2. **Replace `fetchAll`.** Replace `fetchAll`, and `fetchPage` if your
   source uses pagination, with real `fetch()` calls against your
   source's API, HTML, or CSV. Use `ctx.userAgent` and `ctx.signal` (for
   timeout and abort). Honor `ctx.limit` and `ctx.statusFilter` if your
   source supports them.
3. **Map your source's data to `ExternalPerson`.** Look at `mapPerson` in
   the example for the minimum required fields: `externalId`, `source`,
   `name`, and `status`.
4. **Register your adapter in `backend/worker/sync/sources/index.ts`.**
   Follow the existing pattern: add an `import`, then add one line that
   is conditioned on your own new `ENABLE_*` flag. Document this flag in
   `.env.example`, and set its default to `false`. Never turn on a real
   source by default in this template.
5. **Do not import contact data** (the `contact` field in
   `ExternalPerson`), unless you turn it on explicitly with its own flag.
   Importing a missing person's phone number or email, without that
   person's consent, is itself an extortion risk. See the comment in
   `../types.ts` for more detail.

After you register your source, turn it on with
`ENABLE_<YOUR_SOURCE>=true`. You can also scope it, together with other
active sources, using `SYNC_SOURCES` (a comma-separated list of IDs) and
the general scheduler flag `SYNC_SCHEDULERS=1`.

**Vendor and compliance surface:** This surface depends entirely on your
real source. Review your source's terms of use and scraping policy before
you automate reading from it. Remember that you are importing information
about missing persons. Treat this data with the same care as any other
sensitive data in the system. See `SECURITY.md`.

---

## Donations — backend ready, no entry point in the public UI

The donations backend is different from the modules above. It has no
`ENABLE_*` flag. It uses `backend/src/routes/donations.ts` and
`backend/src/services/donations.ts`, and exposes `GET` and
`POST /api/donations`. This backend is always mounted.

Two optional variables, `PAYPAL_DONATION_URL` and
`NEXT_PUBLIC_STRIPE_DONATION_URL`, control whether responses include a
real payment URL. The admin panel already has a donations tab to review
funds raised.

The template does not include a donation component in the public site.
The "Donate" call-to-action in the navigation links to WhatsApp
(`RESPONSEGRID_DONATE_WHATSAPP_URL`) or to the external directory
`/donaciones`. Neither of these paths uses this backend.

This gap is intentional. It is not a bug. If your deployment wants to
collect donations through PayPal or Stripe, from its own UI, the backend
is already ready for that. Build your own form or modal against these
endpoints. `frontend/lib/donation-shared.ts` already provides shared
validation and formatting helpers. Mount your form wherever it fits your
design — the header, the footer, or a dedicated page.
