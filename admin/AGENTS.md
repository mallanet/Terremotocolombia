# AGENTS.md — admin map

**Parent map:** `../AGENTS.md`

## Scope

The admin panel is a standalone Next.js microservice. Its same-origin BFF
forwards requests to the backend. The service stores session state in an
httpOnly cookie.

## Where to look

| Task | Location | Notes |
|------|----------|-------|
| Pages and shell | `app/` | Next.js App Router |
| BFF routes | `app/api/` | Forwards requests to the backend. Not the public-site API. |
| Shared proxy | `app/api/_shared/proxy.ts` | Reuse this for request forwarding |
| API routing config | `src/config/api-registry.ts` | Resolves the backend base URL |
| Session and auth | `src/shared/auth/` | Handles the cookie and the admin gate |
| HTTP client | `src/shared/http/` | Sends authenticated requests from the frontend |
| Domain screens | `src/contexts/` | Covers models, users, roles, keys, hub, and hospital-supplies |
| Generic model CRUD | `src/contexts/models/model-registry.ts` | One entry per simple model. Mirrors the backend's `PUBLIC_RESOURCES` list. |
| UI primitives | `src/ui/` | Shared admin UI atoms and tokens |
| Tests | `tests/` | Vitest, Testing Library, and MSW |

To add a screen, follow one of two patterns:

- A flat CRUD model needs only a `model-registry.ts` entry, with columns and
  create/edit fields.
- A domain with a real workflow, like `hospital-supplies` or
  `patient-imports`, needs its own bounded context. Add it under
  `src/contexts/<name>/`, plus BFF routes under `app/api/admin/<name>/`.

This package runs as a Cloudflare Worker in both environments. See
`wrangler.jsonc` in this directory for the Worker config. See
`docs/runbook-admin.md` for the operations guide.

## Done (local)

See the Useful commands section in the root `AGENTS.md`, under admin. Before
you ship a change, also run `npm run build`.

## Hard stops (this package)

- Keep backend credentials and JWTs on the server. Never expose them through
  `NEXT_PUBLIC_*`.
- Reuse the BFF proxy and session helpers. Do not call internal backend URLs
  from browser components.
- Keep httpOnly cookie handling and deny-by-default admin gates in place.
- Do not duplicate backend authorization decisions in UI-only checks.

## Ask first

- Any change to session cookie, invitation, role, capability, or API-key
  behavior.
- Any new admin exposure of crisis data or patient fields.

## Manual notes

<!-- Preserved on refresh -->
