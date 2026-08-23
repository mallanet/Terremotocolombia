# Process-cache registry (U20 freeze)

Source of truth for the in-process Map in `backend/src/lib/cache.ts`.
U34 will extend this registry to Upstash. Do not add a `cached()` call
without a row here.

Classification:

- **tenant** — key is stored under `t:{org}:{incident}:{epoch}:…`
- **global** — USGS catalog and third-party ResponseGrid directory

Search/filter strings go through `cacheParamDigest` (SHA-256 prefix).
`invalidate(cache)` without a key clears one partition, never the whole Map.

| Call site | Partition | Key pattern | TTL | Notes |
|---|---|---|---|---|
| `routes/earthquakes.ts` | global | `earthquakes:{limit}` | 30s | KTD10 catalog |
| `routes/missing.ts` | tenant | `missing:…`, `missing-map:…`, `missing:stats` | 8s / 30s | digest search |
| `routes/pets.ts` | tenant | `pets:…`, `pets-map:…`, `pets:stats` | 2–30s | digest search |
| `routes/official-deceased.ts` | tenant | `official-deceased:…` | 30s | digest search |
| `routes/patients.ts` | tenant | `patients:search:{digest}:{limit}` | 5s | digest query |
| `routes/hospitals.ts` | tenant | `hospitals:…`, `hospital:{id}`, patients, supply | 5–30s | digest search |
| `routes/campaign.ts` | tenant | `campaign:sites`, `campaign:stats` | 10–30s | |
| `services/reports-read.ts` | tenant | `reports:all`, `reports:page:…` | 8s | |
| `services/hub.ts` | tenant | `hub:{type}:{limit}`, `hub:stats` | 15–30s | |
| `volunteer-analytics.router.ts` | tenant | `vol:analytics:full` / digest(since) | 120s | |
| `acopio-controller.ts` | tenant | `acopio:list:{digest}` | 30s | filtered list |
| `cached-collection-center-provider.ts` | global | `acopio:centers:{source}` | 120s | ResponseGrid only |

Writes pass `requestProcessCache(req)` into services, or
`COLOMBIA_PROCESS_CACHE` for Colombia-compat jobs (sync, patient import,
matcher signals) until those payloads carry TenantScope.
