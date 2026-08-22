# `@mallanet/contracts`

Shared request and response envelopes for the public site, the admin panel,
and the API. Zod schemas are the source of truth. TypeScript types come from
those schemas.

Install with `file:../packages/contracts`. Each app copies the package into
`node_modules` (`install-links=true`). After you change this package, run
`npm ci` in `frontend/`, `admin/`, and `backend/`.

## Envelope inventory

Three list shapes have a named home. Other JSON bodies wait for their own
surface migration. Do not rename a live array key to match a different shape.

| Shape | Schema | Live routes today |
| --- | --- | --- |
| Canonical page | `paginatedEnvelopeSchema(row, rowsKey)` | `GET /api/reports` (`reports`), `GET /api/missing` (`people` + optional `totalCapped`), `GET /api/pets` (`pets` + optional `totalCapped`), `GET /api/deceased` (`people`) |
| Unbounded `{ items }` | `unboundedItemsSchema(item)` | crud-factory lists and other public-api `{ items }` responses |
| Hospitals bare list | `hospitalsBareListSchema(hospital, state)` | `GET /api/hospitals` (`hospitals` + `states`, not paginated) |

`totalCapped` is an optional field on the canonical page. Missing-person and
pet lists may send it. Reports and deceased lists omit it. Both cases parse.

The async-job envelope is `asyncJobAcceptedSchema` (`202 { queued: true, jobId }`)
and `asyncJobStatusSchema` (`queued \| completed \| failed`). The error
envelope is `{ error: string }` with optional `code`.

These live lists are **not** one of the three shapes yet. Keep their wire
keys until that surface migrates:

- `GET /api/acopio` — `{ items, total, facets }`
- `GET /api/patients` search — `{ results, query, hasMore }`
- crud-factory get/create/update — `{ item }`
- map and stats bodies — `{ markers }`, `{ stats }`

## Additive-only checklist (R5)

A public payload change during the migration must stay additive:

1. Keep every existing JSON key and its meaning.
2. Do not rename a domain array key (`reports`, `people`, `pets`, `hospitals`,
   `items`) to a different name.
3. New fields must be optional, or old clients must ignore unknown keys.
4. `code` on errors is optional. Old clients read `error` only.
5. Land the backend contract and a captured production-shape fixture before
   the client starts to enforce that field.
6. Do not put edit tokens, raw URLs, query strings, or citizen payloads into
   logs, analytics, cache keys, or fixtures.

Report-mode validation (`validateContract` / `readContract`) is the default
in production. Development and test always enforce.
