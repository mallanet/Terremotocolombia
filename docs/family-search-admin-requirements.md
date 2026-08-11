# Family Search — requisitos del panel admin de resolución de identidad

**Status:** DRAFT — requirements for maintainer review. Nothing here is implemented or committed to a delivery date.
**Date:** 2026-08-11
**Scope:** admin panel + backend + schema. Public-site changes are called out explicitly where required (consent copy, official-channel links); everything else is admin-side.

---

## 1. Vision

Every person-shaped record on the platform — a missing-person report, a hospital
patient, an unidentified (NN) patient, a "found" report, a row from a partner
feed or a manually uploaded list — gets **one stable, human-communicable
identifier** and lives in **one searchable index**. An **intelligence layer**
continuously proposes links between records that appear to describe the same
person ("this missing-person report matches this hospital patient, confidence
0.93, because: surname exact, age ±1, same municipality"). **Admin staff review
every proposal** in a purpose-built queue — confirm, reject, or mark unsure —
and confirmed links form identity clusters that answer the only question that
matters: *where is this person now?* OCR-ingested documents feed the same
pipeline, and every human correction makes the next extraction better.

Data arrives through an **open-ended set of source connectors** — hospital
feeds, manual uploads, a WhatsApp tipline, social media pipelines, whatever
comes next — all landing on one intake spine, all enriched by the same
**shared capability layer** (OCR, geocoding, entity extraction, sentiment/
urgency, media dedup), and all governed by a **per-source and per-author trust
ladder** that decides how much runs on autopilot. Adding a source is
configuration plus a small adapter, never new architecture.

The platform stays a **feeder and relay for the official channels** (Fiscalía
línea 122 / Mecanismo de Búsqueda Urgente, Medicina Legal SIRDEC, Cruz Roja
Colombiana RCF) — never a competing registry. See §9.

### Design principles (non-negotiable)

1. **The machine proposes; a human disposes.** No auto-merge at any confidence
   level. A false reunification (wrong family notified) is categorically worse
   than a slow true one.
2. **Source records are immutable; decisions are append-only.** Merges must be
   fully unwindable. If a bad link is confirmed, unmerging is a first-class,
   audited operation — not surgery.
3. **Privacy by minimization.** All person records are *datos sensibles* under
   Ley 1581/2012. Internal processing ≠ public display. Anything new that the
   public can see goes through the maintainer + legal review first.
4. **Reuse the proven platform idioms.** Staging tables + idempotent
   claim-based state machines (no interactive transactions on Workers),
   Cloudflare Queues, HMAC document hashes, capability-gated routes with
   `writeAudit`, bounded-context admin UI. This document specifies *what*, and
   points at the existing pattern for *how*.
5. **Autopilot moves data, never identity decisions.** Trusted sources may
   auto-create and auto-update *records, leads, and evidence* (§4.5). No
   trust level ever authorizes merging identities, asserting a person
   deceased, or publishing to the public/family-facing side. Every prior
   crisis system that worked (AIDR, Ushahidi, Meedan Check, SBTF) kept a
   human checkpoint on consequential writes; what good systems automated was
   *reducing the cost of review*, not skipping it.
6. **Sources are pluggable; capabilities are shared.** A connector's only job
   is to turn its channel into normalized intake items. Everything after that
   — enrichment, trust, triage, matching, promotion — is source-agnostic and
   shared. No per-source forks of the pipeline.

---

## 2. What exists today (ground truth)

Verified against the repo on 2026-08-11. This is the substrate the feature
builds on — and the gaps it must fill.

### 2.1 Record populations, currently unlinked

| Population | Table | Identity today | Notes |
| --- | --- | --- | --- |
| Missing-person reports | `missing_persons` (schema.ts:81) | bare `crypto.randomUUID()` | No cédula field at all. No dedup for citizen reports; only `(source, external_id)` upsert for sync feeds. `status` ∈ {active, found} enforced in app code only. |
| Hospital patients | `hospital_patients` (schema.ts:254) | random UUID + `document_hash` (HMAC of normalized cédula, partial unique index) | The only privacy-preserving join key in the system. |
| Patient import staging | `patient_imports` + `patient_import_rows` (schema.ts:294, 350) | deterministic patient id per row on apply | Full staging pipeline with `confidence`, `dedup_candidates`, `needs_review` — but dedups **only against `hospital_patients`**, never against `missing_persons`. |
| Unidentified persons | `unidentified_persons` (schema.ts:697) | random UUID | **Orphaned**: prod rows exist, zero application writers/readers. Marked "legado/externo". |
| Partner-hub mirrors | `hub_missing_persons` etc. (schema.ts:751) | `hub_id` | Read-only federation mirror; ingest worker not deployed. |

**There is no cross-referencing of any kind between these tables** — no FK, no
join query, no shared identifier, no candidate-suggestion mechanism
(confirmed by repo-wide grep: nothing in the patients/imports/OCR pipeline
imports the missing module, and vice versa).

### 2.2 The one existing "intelligence layer" precedent

The patient-import pipeline (`backend/src/services/patient-imports/*`) is the
template for everything in this document:

- Header + rows staging, raw payload in restricted `jsonb`, normalized fields,
  validation errors/warnings.
- `classifyDedup()` (`patient-import-logic.ts:244`) — tiered confidence:
  document-hash exact = 1.0 → same name+age = 0.9 → same name, unknown age =
  0.6 → same name, different age = 0.5.
- Idempotent, Workers-safe apply: conditional-UPDATE claim → deterministic id →
  `ON CONFLICT DO NOTHING` → mark (`apply.ts:18-35`). Zero `db.transaction()`
  calls remain in the live codebase (the warning comment in `db/index.ts:64` is
  stale).
- Live on Cloudflare Queues (`terremotocolombia-imports`, DLQ persisted to
  `audit_log`), with the BullMQ path kept for the compose deployment.

### 2.3 Known dead ends this project must fix (Phase 0)

1. **OCR rows can never be applied.** Every OCR-derived row is forced to
   `needs_review` (`process.ts:196-200`), but `applyOneRow` only claims rows
   with `rowStatus='valid'` (`apply.ts:81-90`), and **no endpoint exists to
   edit, confirm, or reject a row**. OCR import is currently a pipeline into a
   wall. (Note: the `staging` branch already carries "edición iterativa de
   pacientes" — cédula hash-only capture + hospital transfer. Phase 0 must
   build on that work, not parallel it.)
2. **PDF ingestion is a dead branch**: `isOcrPendingContentType` accepts
   `application/pdf` but the route requires `image/*` and returns 501
   (`public-api/patient-imports.ts:202-224`).
3. **`addMissing()` records no `ipHash`** unlike every other public write —
   no submitter accountability trail on the single most sensitive intake path.
4. **`updateMissing` has no audit trail** (blind UPDATE; only delete audits).
5. **OCR extraction is flat and confidence-free** — no per-field signal, no
   bounding boxes, no correction capture (`ocr/minimax-provider.ts`).

### 2.4 Platform constraints that shape every design below

- **No interactive DB transactions on Workers** (Neon HTTP driver). Any
  multi-step write = idempotent claim-based state machine, per the
  patient-imports pattern.
- **Cloudflare Queues**: messages ≤128KB → queue messages carry ids/R2 keys,
  never payloads. Consumer CPU can be raised via `limits.cpu_ms`.
- **Capability seed is human-gated** (`worker/migrate.ts` → `seedAuth()`): new
  capability keys are inert in prod until the maintainer runs the migrate job.
  §10 minimizes new keys and flags the seed as a hard deployment dependency.
- **Rate limiting runs degraded** (per-isolate memory, no Valkey) and
  **Turnstile is disabled**. No new *public* intake surface ships until
  Turnstile is reinstated in the documented order (site key in bundle first,
  then secret).
- **`main` deploys to production automatically** for all three apps. Schema
  migrations remain a separate human step against Neon direct.
- pg_trgm/unaccent are already in use for missing-person search
  (`idx_missing_search` is consulted conditionally); `fuzzystrmatch` must be
  verified/enabled on Neon before Phase 2.

---

## 3. Data model: identities, links, clusters

Three new concepts, all additive — **no existing table changes its write path**.

### 3.1 Person Record Number (PRN) — the unique identifier

Every person-shaped record gets a PRN via a registry table, not via new columns
on each source table:

```
person_records
  prn          text PK        -- e.g. "TC-7XK4M2Q9" (see format below)
  record_type  text NOT NULL  -- 'missing_report' | 'hospital_patient'
                              --   | 'unidentified_person' | 'import_row'
                              --   | 'hub_missing' | ...
  record_id    text NOT NULL  -- PK of the row in its source table
  created_at   epoch_ms NOT NULL
  UNIQUE (record_type, record_id)
```

- **Format:** `TC-` + 8 chars of Crockford base32 (no I/L/O/U) + 1 check
  character. Case-insensitive, phone-communicable, typo-detecting. A family
  member on the phone can read "TC-7XK4M2Q9" to a volunteer and the volunteer
  can type it into the search box.
- **Assignment:** service-level, at record creation for new records; a one-off
  backfill job (queue-driven, idempotent) stamps existing rows. The registry
  is an *overlay* — source tables never learn about it, so deploy order
  degrades safely (registry table is inert until code reads it).
- **The PRN identifies a record, not a person.** The *person* is the cluster
  (§3.3). Public/staff communication uses the PRN of the primary record in a
  cluster; scanning any member PRN resolves to the cluster.

### 3.2 Links — pairwise, evidence-carrying, append-only decisions

```
person_links
  id             text PK
  prn_a          text NOT NULL   -- ordered: prn_a < prn_b (one row per pair)
  prn_b          text NOT NULL
  status         text NOT NULL   -- 'proposed' | 'confirmed' | 'rejected' | 'unsure'
  score          double          -- matcher probability at proposal time
  evidence       jsonb NOT NULL  -- per-field comparison outcomes that produced
                                 -- the score (allowlisted, PII-minimal, e.g.
                                 -- {"surname":"exact","age":"±1","muni":"exact"})
  method         text NOT NULL   -- 'deterministic' | 'probabilistic' | 'manual'
  matcher_version text           -- weight-set version that scored it (§5.5)
  proposed_at    epoch_ms NOT NULL
  UNIQUE (prn_a, prn_b)

person_link_decisions            -- append-only; the link's status is the
  id             text PK         -- latest decision. Never UPDATE a decision.
  link_id        text NOT NULL REFERENCES person_links
  decision       text NOT NULL   -- 'confirmed' | 'rejected' | 'unsure'
  note           text NOT NULL DEFAULT ''
  decided_by     text NOT NULL   -- users.id — reviewer attribution is mandatory
  decided_at     epoch_ms NOT NULL
```

- A **rejected pair is a tombstone**: the matcher must not re-propose it
  (same idea as `missing_person_suppressions`) — *unless* a strictly stronger
  evidence class appears later (e.g. a document-hash exact match arrives for a
  pair previously rejected on name-only evidence). Re-proposals carry a
  visible "previously rejected, new evidence: documento" banner.
- `unsure` requeues with the note attached; it is a real outcome, not a
  failure to decide. Forcing binary decisions under uncertainty is the main
  source of reviewer error.
- Every decision writes `audit_log` via `writeAudit` (actions:
  `personlink.confirm`, `personlink.reject`, `personlink.unsure`).

### 3.3 Clusters — the "person" object

```
person_clusters
  id           text PK
  status       text NOT NULL    -- derived lifecycle, see §7.3
  created_at   epoch_ms NOT NULL

person_cluster_members           -- current membership; history preserved
  cluster_id   text NOT NULL
  prn          text NOT NULL
  added_at     epoch_ms NOT NULL
  removed_at   epoch_ms          -- NULL = current member (unmerge sets it)
  added_by     text NOT NULL     -- users.id or 'system'
  UNIQUE (prn) WHERE removed_at IS NULL   -- a record lives in ≤1 live cluster
```

- Clusters are **connected components over confirmed links only** — never
  over raw scored pairs (transitive closure over proposals creates "black
  hole" clusters where one bad edge chains strangers together).
- **Cluster-merge is a distinct, escalated decision.** When confirming a link
  would join two clusters that each already have ≥2 members or ≥1 confirmed
  link, the confirmation is held in a separate "cluster merge" queue behind a
  higher capability (§10). Merging two anchored identities is the
  highest-risk action in the system.
- **The golden view is computed, never stored.** A cluster's display
  (name, status, current location, photo set) is a read-time projection over
  member records with explicit survivorship rules: hospital-sourced status
  beats citizen-reported status; most recent wins within a tier; every
  projected field shows its provenance badge in the UI. Recomputation after
  merge/unmerge is therefore instant and free of migration risk.
- **Unmerge**: sets `removed_at` on membership rows, appends a decision row
  rescinding the link, audits, and re-runs the matcher for the detached
  records. One capability-gated button, not a support ticket.

### 3.4 Source authority

Every record carries a source, and every source carries an **authority tier**
(1 = official/hospital … 4 = unverified public). Matching weights,
survivorship rules, and UI badges all read this tier: a hospital intake row
asserting "at Hospital San José, stable" outranks a citizen report asserting
"seen near Armenia"; both remain visible. The full source registry — including
trust and autopilot configuration — is defined in §4.1.

---

## 4. Ingestion: the source-connector framework

The requirement is open-ended: hospital feeds today, WhatsApp and social
media pipelines tomorrow, sources nobody has named yet after that. So
ingestion is specified as a **framework with one contract**, not a list of
integrations. A new source must never require touching the matcher, the
review queues, the enrichment services, or the schema of canonical tables.

```
            connectors (one per channel; thin)
  push API │ pull adapter │ webhook stream │ manual upload │ curated paste
      └──────────────┬──────────────────────────────┘
                     ▼
        intake spine (two lanes, §4.2–4.3)
   batch lane: record_imports        stream lane: intake_items
                     │
                     ▼
        shared enrichment capabilities (§4.4)
   ocr · geocode · entities · language · sentiment/urgency
   media-rehost · perceptual-hash · claim-clustering
                     │
                     ▼
        trust + autopilot routing (§4.5)
   auto-promote │ triage queue │ archive
                     │
                     ▼
   person_records (PRN) → matcher (§5) → review queues (§7)
```

### 4.1 Source registry & connector contract

```
sources
  id              text PK        -- 'hospital:<id>', 'whatsapp-tipline',
                                 -- 'social:x', 'social:curated', 'feed:<name>'
  kind            text NOT NULL  -- 'push_api' | 'pull_adapter' | 'webhook'
                                 --   | 'manual_upload' | 'curated'
  authority       integer NOT NULL -- 1 official … 4 unverified public (§3.4)
  autopilot_level integer NOT NULL DEFAULT 0   -- ceiling for this source, §4.5
  enrichment_plan jsonb NOT NULL DEFAULT '[]'  -- ordered capability list
  paused          boolean NOT NULL DEFAULT false  -- per-source kill switch
  display_name    text NOT NULL
  config          jsonb NOT NULL DEFAULT '{}'  -- non-secret adapter config
  created_at / updated_at
```

- **Connector contract:** a connector receives its channel's raw payload and
  emits normalized **intake items** (§4.3) or **import batches** (§4.2).
  Nothing else. Connectors never write canonical tables, never call
  enrichments directly, never make trust decisions.
- **Transports, all existing idioms:**
  - *push_api* — scoped `api_keys` + `Idempotency-Key` against the import
    endpoints. A wired partner is an API key + a `sources` row.
  - *pull_adapter* — cron-triggered, following the hub-ingest template
    (cursor + mode incremental/backfill/reconcile + time budget +
    checkpoint-per-page).
  - *webhook* — a Worker route that verifies the channel's signature,
    persists media to R2 immediately (some channels' media URLs expire in
    minutes — WhatsApp's in 5), and enqueues `{source_id, item_ids}` only
    (Queues messages ≤128KB). Consumers are idempotent: Queues is
    at-least-once, so dedup is consumer-side by platform message id **and**
    content hash (reposts circulate under new ids).
  - *manual_upload / curated* — admin UI paths (§4.2, §4.6).
- **Secrets live in Doppler** per existing policy; the `sources.config` jsonb
  holds only non-secret settings (handles to watch, polling cadence,
  enrichment options).
- **Source health is first-class:** freshness, volume, error rate per source
  on the admin dashboard; a stale feed is surfaced, not silently absent.
- **Explicitly out of scope regardless of connector:** scraping
  Registraduría's cédula-status page; RIPS as a "live patient feed" (it's
  billing, not a census); SIRDEC "integration" without a written agreement.
  Official interop is **export/relay**: minimal handoff files for Medicina
  Legal/Fiscalía/Cruz Roja generated from confirmed clusters, recorded in the
  cluster timeline.

### 4.2 Batch lane — generalize `patient_imports` (don't fork it)

For tabular/bulk sources (hospital lists, CSV/XLSX uploads, partner feeds):
extend `patient_imports` into a general record-import pipeline with a
`target_type` (`hospital_patients` | `missing_persons` |
`unidentified_persons`) rather than cloning it per population.

- Same header + rows shape, same status machine
  (`pending → queued → processing → processed → applying → applied | failed`),
  same queue, same idempotent apply.
- `process` gains population-specific normalizers/validators; `apply` gains
  population-specific writers (deterministic-id + `ON CONFLICT` idiom).
- Accepted inputs everywhere: JSON rows, CSV, XLSX, `image/*`; **fix PDF**
  (route through OCR per-page or reject consistently — not the current
  contradiction).
- Every applied row lands in `person_records` (PRN) and is swept by the
  matcher automatically.

### 4.3 Stream lane — `intake_items`, the universal unit for item-shaped data

A WhatsApp message, a social post, a pasted tip, a single photo — anything
that isn't a tabular batch — becomes one intake item:

```
intake_items
  id            text PK
  source_id     text NOT NULL REFERENCES sources
  author_id     text REFERENCES source_authors     -- §4.5, when known
  external_id   text            -- platform message/post id (dedup key 1)
  content_hash  text            -- sha256 of text + perceptual hash of media
                                -- (dedup key 2: reposts under new ids)
  claim_cluster_id text         -- near-duplicate claim grouping (§4.4)
  raw           jsonb NOT NULL  -- restricted, never public (patient_imports
                                -- raw_data discipline)
  media_keys    jsonb NOT NULL DEFAULT '[]'   -- R2 refs, rehosted at receipt
  status        text NOT NULL   -- received → enriched → triaged
                                --   → promoted | archived | discarded
  triage        text            -- 'auto' | 'human'; who moved it past triaged
  promoted_prn  text            -- person_records.prn created/updated, if any
  received_at / updated_at
  UNIQUE (source_id, external_id) WHERE external_id IS NOT NULL
```

- Lifecycle is the same idempotent claim-based state machine as imports; each
  enrichment step and the triage transition are separate queue jobs.
- **Promotion** (§4.5 decides *who* may trigger it) does one of:
  1. create a **lead** — a new person record (`record_type='intake_lead'`)
     entering the PRN registry and the matcher like any other record. Leads
     are internal-only; they are *not* rows in `missing_persons` and never
     appear on the public site. Publishing a lead as a public missing-person
     listing is a separate, always-human, consent-checked act;
  2. attach to an existing cluster as **evidence/note** (timeline entry with
     provenance);
  3. update non-identity metadata on a record the same source originally
     created (last-seen refinement, additional photo).
- **Retention:** raw payloads of items that end `archived`/`discarded` are
  purged on a short clock (§9.5 — default 30 days); promoted items keep only
  what the lead/evidence needs.

### 4.4 Shared enrichment capabilities

One processor contract, reused by both lanes and every future source. A
capability takes an item (or row), is **idempotent and versioned**, and
appends annotations — it never mutates the item's raw payload:

```
item_annotations
  id, item_id, capability, capability_version,
  output jsonb, confidence double, produced_at
```

| Capability | Status | Notes |
| --- | --- | --- |
| `ocr` | exists (§6) | provider interface + correction loop; same eval discipline everywhere |
| `geocode` | exists | Nominatim + `geocode_cache`, 1 req/s budget-bounded cron (`geocode-batch.ts`) — reused as-is for item location text |
| `media-rehost` | exists | R2 + `photo_migrated_at` idiom |
| `entities` | new | names/ages/relationships/phones/hospital mentions from free text (LLM extraction, structured output, §6 confidence discipline) |
| `language` | new | es/en + dialect flags; routes prompts |
| `sentiment-urgency` | new | distress/urgency scoring for triage ordering — an *ordering* signal only, never an evidence signal for matching |
| `phash` | new | perceptual hash of media → repost collapse + recycled-footage detection (match against media seen before the event or in other events) |
| `reverse-image-assist` | new | pre-filled reverse-image search links (+ optional API) surfaced in the triage checklist; recycled disaster footage from prior events is a top misinformation pattern and fooled major outlets in Nepal 2015 |
| `pii-redaction` | new | strips third-party bystander PII from free text before anything is displayed beyond the triage queue |
| `match` | §5 | the matcher itself is just the last capability in every plan |

- `sources.enrichment_plan` is the ordered capability list per source; each
  step is a queue job (per-step CPU via `limits.cpu_ms` where needed).
- Every new/changed capability version ships through the same
  **eval-set gate** as OCR prompts (§6.2): corrections and triage decisions
  become labeled cases; a version that regresses doesn't deploy.

### 4.5 Trust ladder & the autopilot matrix

Two registries govern automation — the **source** (the channel) and, for
social/messaging channels, the **author** (the account/poster):

```
source_authors
  id            text PK
  platform      text NOT NULL      -- 'x' | 'instagram' | 'tiktok' | 'whatsapp' | ...
  platform_id   text NOT NULL      -- stable id, not display handle
  display_name  text NOT NULL DEFAULT ''
  trust_state   text NOT NULL DEFAULT 'unobserved'
     -- unobserved → observed → provisional → trusted → trusted_org
     -- suspended (reachable from any state)
  evidence      jsonb NOT NULL DEFAULT '{}'  -- track record: items promoted,
                                             -- items later confirmed/refuted,
                                             -- corroboration stats
  UNIQUE (platform, platform_id)

source_author_trust_decisions      -- append-only, like person_link_decisions
  id, author_id, from_state, to_state, reason, evidence_snapshot jsonb,
  decided_by,                      -- users.id | 'system' (demotions only)
  decided_at
```

**Trust rules (from AIDR/Ushahidi/SBTF/Meedan lessons):**

- **Promotion is evidence-gated and human-granted.** The system *proposes*
  promotions (N items human-confirmed accurate over a minimum window); an
  admin grants them. A single admin click without a track record cannot mint
  `trusted` — Ushahidi's documented failure was exactly informal, ad hoc
  trust tags.
- **Demotion is asymmetric: one click, or automatic.** A single confirmed
  fabrication auto-suspends. Anomalies (volume spike, correction-rate spike,
  behavior change) auto-drop an author/source one level and alert. Hard to
  earn, easy to lose.
- **`trusted_org` is structurally different** — reserved for out-of-band
  verified organizations (Cruz Roja, Defensa Civil, hospital press offices,
  UNGRD), confirmed by phone/email with the org, kept as a small hand-curated
  allowlist. Platform verification badges and follower counts are
  purchasable and are never a trust input on their own.
- **Corroboration co-gates with trust.** Near-duplicate claims are clustered
  (`claim_cluster_id`: same person name + similar photo/description across
  connectors, reshares collapsed via `phash`/content-hash). Routing combines
  trust × independent-corroboration count: a well-corroborated claim (≥2
  independent origins, ideally cross-platform) accelerates even from
  `observed` authors; a single-source claim from a `trusted` author still
  queues for human review before anything consequential. This is the defense
  identity-trust alone cannot provide — reputation-farming accounts build
  track records resharing verified content, then inject one fabrication at
  peak leverage.

**The autopilot matrix** — `min(source.autopilot_level, author level)` sets
the row; the *action type* sets the column. L3 does not exist for anyone:

| Action | L0 observe | L1 suggest | L2 autopilot | never |
| --- | --- | --- | --- | --- |
| Ingest + enrich + cluster | auto | auto | auto | |
| Create triage-queue entry | — | auto | auto | |
| Create internal **lead** (PRN + matcher sweep) | human | human | **auto** | |
| Attach evidence/note to a cluster | human | human | **auto** | |
| Update non-identity metadata on own-source records | human | human | **auto** | |
| Confirm an identity link / merge clusters | | | | **always human** (§5) |
| Assert deceased | | | | **always human + official channel only** (§7.3) |
| Publish anything public/family-facing | | | | **always human + consent-checked** |

- Every autopilot action writes `audit_log` with full provenance: source,
  author trust state *at action time*, corroboration count, enrichment
  versions, checklist signals. Reversible by any reviewer (`person:review`),
  not just the author of the trust grant.
- **Kill switches:** per-source `paused`, per-author `suspended`, and one
  global autopilot pause (config flag) that drops every source to L1 without
  a deploy.
- **Sampling audit is scheduled, not aspirational:** during active response,
  a daily random slice of autopilot-created leads gets human re-review;
  confirmed errors feed demotion triggers automatically. (AIDR's failure:
  classifier quality measured once at deployment, never recalibrated
  mid-disaster.)

### 4.6 Channel notes (v1 reality check)

- **WhatsApp tipline — build first.** The one channel with a purpose-built
  lawful path and humanitarian precedent (Meedan Check tiplines 335k+
  requests; Turn.io/WHO at 14.7M users). Cloud API webhook → verify → **fetch
  media to R2 immediately** (download URLs expire in 5 minutes and need the
  app bearer token — this step cannot be deferred to a lazy consumer) →
  enqueue. Respect the 24h service window (template messages only outside
  it); reporter consent collected inline in the conversation — which maps
  cleanly onto Ley 1581. Note: messaging limits are per business portfolio,
  not per number — adding numbers does not add surge capacity.
- **Social media — human-curated in v1, automated only when two gates clear.**
  V1 is a *curated intake* form: staff/volunteers paste a post URL +
  screenshot; it becomes an `intake_items` row on the `social:curated` source
  and flows through the full pipeline (enrichment, claim clustering, trust
  tracking of the *original poster* as `source_authors` rows). Automated
  ingestion is gated on: (a) **legal basis resolved** (§9.5 — Ley 1581 has no
  legitimate-interest test and "publicly available" ≠ consent), and (b) **an
  access path that actually exists**: X is pay-per-use/enterprise ($42k+/mo
  class for streams), Meta Content Library is researcher-gated and batch-only,
  TikTok's Research API is academic-only, Instagram's Graph API only covers
  accounts you manage. Third-party scraping aggregators don't solve either
  gate and add contractual exposure — if used at all, scope to one-off manual
  verification lookups by an analyst, never a standing pipeline.
- **The framework doesn't care which gate opens first.** When a lawful social
  feed (or any new channel — Telegram, radio transcripts, shelter check-in
  apps) becomes available, it's a `sources` row + a connector emitting
  `intake_items`, entering at L0 and earning its way up the ladder like
  everything else.

### 4.7 Manual upload & evidence attachments

- Admin upload UI for lists (CSV/XLSX/photo-of-list/PDF) targeting any
  population — including the missing admin path to launch an **image/OCR
  import**, which the backend supports but the UI never exposes.
- **Evidence attachments**: R2 objects (photos of handwritten lists, ID
  scans, hospital fax pages, social screenshots) attachable to an import,
  intake item, or cluster. Prefix `evidence/`, metadata row per object
  (uploader, source, sha256, content-type), served only through
  capability-gated endpoints — never public URLs. Reuses
  `persistPhotoDataUrl`'s R2 machinery.

---

## 5. The matching engine (intelligence layer)

Runs as a queue job (`terremotocolombia-matcher` or a new mode on the existing
imports queue) triggered on: record created/updated, import applied, weights
version changed (targeted re-sweep), unmerge. Output: `person_links` proposals
with evidence. **It never writes to source tables and never merges anything.**

### 5.1 Normalization substrate (new columns/tables, backfilled)

Per person record, a `person_match_keys` row:

- `given_names_norm`, `surname1_norm`, `surname2_norm` — lowercased,
  `unaccent`ed, whitespace-collapsed; Spanish connectors (de, del, de la, y)
  stripped for matching, preserved for display. Best-effort parse of the
  single `name` string into components; unparseable names keep a
  `full_name_norm` fallback lane.
- `dmetaphone(given)` / `dmetaphone(surname1)` — **pre-filter only**, never a
  scoring signal (English-tuned phonetics are unreliable on Spanish).
- `age_band` (±tolerance handled in scoring, not banding), `sex` if present.
- `muni_norm` / `dept_norm` from geocoding output or structured fields.
- `document_hash` — extend the existing HMAC (`PATIENT_DOCUMENT_HASH_SECRET`
  pattern) to missing-person reports: a new **optional** cédula field on
  intake (§9.3 covers the consent copy), stored *only* as `tipo_documento` +
  HMAC. Same secret + normalization as `hospital_patients.document_hash` so
  hashes are joinable. Raw document numbers are never stored (staging
  `raw_data` jsonb excepted, already restricted).
- GIN trigram indexes on the name-norm columns.

Colombian identifier rules (apply everywhere a document is touched):
`numero_documento` is a **string** (leading zeros are real — pre-NUIP cédulas
run 6–8 digits); there is **no public check-digit algorithm for the cédula**
(the known check digit is the NIT derivation — do not "validate" cédulas with
it); `tipo_documento` ∈ {CC, TI, CE, PA, RC, NUIP, **sin_documento**} — and in
a disaster, `sin_documento` is a majority case, so nothing may make the
document mandatory.

### 5.2 Candidate generation (blocking)

Multiple cheap, high-recall rules, unioned (any single rule misses
transcription variants):

1. `document_hash` exact (cross-population) — always a candidate, bypasses
   scoring bands as a "strong deterministic" proposal.
2. `surname1_norm` trigram similarity > threshold (tuned; the 0.3 default is
   too loose).
3. `dmetaphone(surname1)` equal AND age within ±5.
4. Same `muni_norm`/`dept_norm` AND `given_names_norm` trigram > threshold.
5. Full-name-lane trigram for unparsed names.

Pairs are generated **across populations** (missing ↔ patient, missing ↔
unidentified, missing ↔ missing for report dedup, found-report ↔
active-report, and **intake leads ↔ everything** — a promoted social/WhatsApp
lead is a person record like any other) and never within the same record.
Claim clustering (§4.4) runs *before* the matcher: reposts of the same post
collapse into one claim, so ten retweets are one candidate, not ten.

### 5.3 Scoring — Fellegi-Sunter-lite, in Postgres/TypeScript

Per candidate pair, per field, classify a **comparison level** (exact /
phonetic-or-fuzzy / conflict / missing) and sum log-weights:
`M = Σ log2(m_i/u_i)`, `p = 2^M / (1 + 2^M)`.

- Start with heuristic m/u priors (document exact: m≈.9/u≈.001; surname1
  exact: m≈.85/u≈.02 — común surnames make u fatter; age ±2: m≈.8/u≈.15;
  same municipality: m≈.7/u≈.1). Re-estimate u from corpus sampling as data
  grows; refine m from confirmed links **only from human decisions, never
  from the matcher's own auto-filings** (feedback-loop bias).
- **Field-level notes:** surname1 (apellido paterno) carries the most weight —
  stable and relatively rare; given names get nickname normalization
  (Pepe→José, Paco→Francisco — small curated table, extendable from review
  notes); age is weak evidence (disaster ages are estimates — wide tolerance,
  low weight); compound surnames match on head component ("Pérez de la
  Torre" ↔ "Pérez" = partial level, not conflict).

### 5.4 Bands and what each band does

| Band | Probability | System behavior |
| --- | --- | --- |
| Strong | ≥ 0.95 or document-hash exact | Top of review queue, badge "coincidencia fuerte". **Still human-confirmed. No exceptions.** |
| Review | 0.5 – 0.95 | Ordinary review-queue entry. |
| No-match | < 0.5 | Auto-filed, not surfaced. A random sample is periodically hand-audited for false negatives (§11). |

### 5.5 Versioning & bias controls

- Every weight-set/blocking change gets a `matcher_version`, a dated rationale
  note, and a re-score of a fixed labeled sample before rollout (the eval-set
  discipline of §6, applied to matching).
- Proposals store the version that scored them; queues can be re-swept on
  version bump without erasing decisions.

---

## 6. OCR v2 — extraction that improves as it processes

The provider interface (`services/ocr/`) stays; everything around it grows.

### 6.1 Extraction contract

- Structured output (JSON schema, one object per row) with **per-field
  value + confidence tier**, where the tier is *derived*, never the model's
  self-rating alone: (a) **self-consistency** — 2–3 passes, disagreement ⇒
  low; (b) a **verifier pass** — cheap second call shown the extracted value
  + the region, answering match/no-match/uncertain; (c) **deterministic
  checks** — ages 0–120, dates parse, hospital resolves, document shape.
- **Structural sanity before field confidence:** extracted row count vs. rows
  visible in the image; header/column expectations per layout. A shifted
  column produces many individually-plausible wrong cells; only a structural
  check catches it.
- **Difficulty pre-triage:** blur/resolution/handwriting flags route hard
  documents to a stronger provider tier (the interface already supports
  swapping providers) and to full-page review rather than spot checks.
  Handwritten triage sheets are the expected worst case and the most likely
  input in this disaster.

### 6.2 The correction loop (the actual "improving" mechanism — no model training)

```
ocr_corrections                  -- immutable; this log is the learning asset
  id, import_row_id, field,
  model_value, corrected_value,
  document_r2_key, layout_cluster_id,
  provider, prompt_version,
  corrected_by, corrected_at
```

1. **Every human edit of an OCR row is captured** as a correction pair —
   automatically, in the row editor (§7.4). No separate labeling workflow.
2. **Eval set:** corrections become versioned eval cases (document + expected
   JSON). Any prompt, provider, or routing change must beat the current
   per-field accuracy on the eval set before shipping. No eval pass, no
   deploy.
3. **Layout/template memory:** each document is fingerprinted
   (source hospital + structural features: column count/order, header text —
   not just sender, because forms change mid-crisis) into a
   `layout_cluster_id`. Per cluster: 2–4 corrected few-shot examples + an
   optional prompt addendum ("this hospital's columns: Nombre, Edad, Cama,
   Triage"). The same hospital's daily fax gets better every day it's
   corrected. Drift detection: a rising correction rate in a "solved" cluster
   flags its examples for re-review.
4. **Provider routing:** familiar layouts + high agreement → fast/cheap
   provider (MiniMax today); hard/unfamiliar/handwritten → stronger tier;
   provider errors → fallback. New escalation providers are eval-gated too.

### 6.3 Review policy

Identity and severity fields (**name, documento, triage/condition, hospital/
ward**) are human-confirmed **forever**, at any confidence. Auto-accept above
strict thresholds is permitted only for low-stakes formatting fields, with a
sampled audit. The generic industry curve ("review rate 20%→5%") is explicitly
not a goal for identity fields in this domain.

---

## 7. Admin UX — the Family Search panel

New bounded context `admin/src/contexts/family-search/` (own workflow ⇒ own
context per `admin/AGENTS.md`, not a model-registry entry), BFF routes under
`app/api/admin/family-search/*`, Spanish UI copy, existing conventions
(adminFetch + TanStack Query, `RequireCapability`, side-by-side panels — no
modals; a shared cursor-pagination primitive gets built here, copying the
audit pattern, because record volumes will need it).

### 7.1 Búsqueda (the family-search screen)

- One search box, accent/case-insensitive, fuzzy (the pg_trgm machinery from
  §5.1), searching **across all populations at once**; a PRN typed exactly
  jumps straight to its cluster.
- Facets: population, cluster status, hospital, municipio/departamento, age
  band, has-photo, source/authority tier, has-pending-proposal.
- Results grouped by cluster: one card per identity, member-count badge,
  provenance chips, status. Ungrouped single records appear as
  single-member clusters.

### 7.2 Ficha de persona (cluster detail)

- **Timeline** (PFIF-style append-only notes): report received, import
  applied, link confirmed (by whom), status changed, handoff to Cruz
  Roja/Fiscalía recorded, resolution. Status is never edited in place — a new
  note supersedes.
- **Members panel:** each source record with provenance badge, PRN, per-field
  values side by side; the computed golden view on top with per-field source
  attribution.
- **Evidence panel:** attached documents (capability-gated serving).
- Actions: propose link manually (search-and-attach), unmerge (escalated
  capability), record official-channel handoff, archive.

### 7.3 Cluster lifecycle statuses

`reported_missing → match_pending → located_hospital | located_other |
resolved_reunited → archived/expired`, plus `unresolved_expired`.
"Confirmed deceased" is **not** a status this platform asserts publicly;
internally it exists only as "reported by official channel" with the source
recorded (see §9 — Registraduría "cancelada por muerte" and similar signals
are cross-reference hints for staff, never family-facing labels from us).

### 7.4 Cola de revisión (match review queue)

The centerpiece. Requirements:

- **Side-by-side comparison card**: record A (e.g. missing report) left,
  record B (e.g. hospital patient) right; per-field agreement coloring —
  green exact / amber fuzzy-phonetic / red conflict / gray missing; aggregate
  score shown prominently but never as the only input; photos displayed for
  human visual comparison (no automated face matching in any phase — a CV
  pipeline is out of scope for this team; human eyes on photos capture most
  of the value).
- **Three actions**: Confirmar coincidencia / No es la misma persona /
  No estoy seguro (+nota, requeues). Keyboard-first (1/2/3 + enter), because
  queue throughput during a surge is a safety property.
- Ordering: strong band first, then score — with filters for recency and data
  completeness (the most useful match to resolve next is not always the
  highest-scoring one).
- **Cluster-merge sub-queue**: proposals that would join two anchored
  clusters render both full clusters (not just the pair) and require the
  higher capability (§10). Visually distinct — this is the "are you sure"
  tier, by design.
- Every card shows *why* (the evidence breakdown), the matcher version, and —
  for re-proposals — the "previously rejected, new evidence" banner.

### 7.5 Cola de triaje (intake triage queue)

Where L0/L1 intake items (and every uncorroborated single-source claim) wait
for a human. Distinct from the match review queue: triage decides *is this a
real, usable tip*, matching decides *is this the same person*.

- Item card: media + text, enrichment annotations (entities found, geocode,
  language, urgency), claim-cluster panel (independent corroborations vs
  reshares), author panel (trust state, track record).
- **Verification checklist widget** — structured pass/fail/unknown per signal,
  not free text, so decisions are fast, consistent across shifts, and
  auditable: reverse-image links pre-filled (recycled-footage check); EXIF
  when present (absence is normal — platforms strip it — never a red flag on
  its own); landmark/geography plausibility; independent-corroboration count;
  account signals (age, pre-disaster history, network position); claim
  specifics that can be pinged (hospital name, ward).
- Actions: promote as lead / attach to cluster / archive / discard +
  report-author (feeds demotion). Urgency-sorted (the `sentiment-urgency`
  capability orders the queue; it never scores identity evidence).

### 7.6 Fuentes y autores (source & trust management)

- Sources table: kind, authority, autopilot level, paused toggle, health
  (freshness/volume/error), enrichment plan.
- Authors table: trust state, evidence summary (promoted / confirmed /
  refuted counts), pending system-proposed promotions awaiting a human,
  decision history. Promotion approvals and the `trusted_org` allowlist live
  behind `source:manage` (§10).
- The global autopilot pause switch lives here, visible and loud.

### 7.7 Import review (upgrade of the existing rows table)

- Per-row **editor**: image crop beside the fields (zoom-to-region on field
  focus once region data exists; whole-image beside form until then),
  confidence-tinted fields, low-confidence-first ordering.
- Row actions: save-corrections (⇒ revalidate ⇒ may become `valid`), accept
  dedup candidate (⇒ merges into the existing patient instead of creating),
  reject candidate, mark invalid. This unblocks the `needs_review` dead end
  and — automatically — feeds `ocr_corrections`.
- Batch view keeps the existing polling/apply flow.

---

## 8. Public-site touchpoints (minimal, but required)

1. **Official channels first**: missing-person pages and the report flow
   display Fiscalía 122 / Medicina Legal SIRDEC public search / Cruz Roja RCF
   (WhatsApp +57 321 213 9525) prominently. We are a complement, and say so.
2. **Consent copy at intake** (§9.3) — checkbox-level consent for public
   listing, separate from the processing consent; optional cédula field
   explained ("solo se guarda una huella criptográfica, nunca el número").
3. **Status display**: a publicly listed missing person whose cluster reaches
   `located_hospital` shows "posible avance — contacte los canales oficiales /
   la línea de la organización" — **not** the hospital name, ward, or
   condition. Detail flows person-to-person through staff, not through a URL.
4. No public exposure of clusters, links, PRNs of hospital records, or any
   NN patient data (§9.2).

---

## 9. Privacy, legal, and safety requirements (Colombia)

All of this section is **blocking** for any phase that touches the relevant
surface. Local legal counsel review is required before Phase 2 ships the
cédula intake field and before any change to public display. This document is
not legal advice.

### 9.1 Ley 1581/2012 baseline

- Health data and a person's status/whereabouts are **datos sensibles**.
  Art. 10 exceptions (urgencia médica/sanitaria, requerimiento de entidad
  pública) cover *internal processing and handoff to official bodies* — they
  are **not** a license for public display. Public listing rests on explicit
  authorization from the reporter, minimized fields, and a retention sunset.
- **Never displayed publicly:** document numbers (we don't even store them
  raw), full birth dates, home addresses, diagnoses/condition detail,
  next-of-kin contact data, anything attributing responsibility (conflict
  sensitivity), hospital+ward of a matched person (§8.3).
- **Data-subject rights**: extend the existing `data_deletion_requests` flow
  to accept a PRN, and implement **cluster-aware deletion**: purging a record
  tombstones its links, recomputes its cluster, and de-indexes public pages.
  Deletion of a *report about* a person can be requested by the person found.
- **The current public privacy policy is US boilerplate** (CCPA/COPPA) that
  neither matches collected fields nor cites habeas data. Rewrite is a
  Phase 2 dependency (cédula field) — maintainer + counsel.

### 9.2 NN (unidentified) patients and minors

- NN hospital patients: **internal-only by default.** No public photo or
  description until the hospital's Medicina Legal/CTI notification duty is
  demonstrably done; even then, default to staff-mediated disclosure.
- Minors: tipo_documento TI/RC, Ley 1581 art. 7 stricter bar; **no public
  listing of unaccompanied minors** — priority routing to ICBF recorded in
  the cluster timeline instead.

### 9.3 Consent & retention

- Intake consent copy (Spanish, plain language): what is collected, what is
  shown publicly (and that it's optional), that data is shared with official
  search bodies, how to request removal, the retention window.
- **PFIF-style expiry is a requirement, not a nice-to-have**: public listings
  auto-de-index at resolution + 90 days or 12 months after last activity
  (whichever first); internal cluster data archives (PII-minimized: PRNs +
  dates + decisions retained for audit; free-text and photos purged) on a
  schedule the maintainer sets in §13. Cron-triggered, audited, with a
  pre-purge report.

### 9.4 Third-party social content (blocking for any automated social ingestion)

- **Every scraped/ingested social post has two data subjects who never
  consented to this platform**: the missing person (photo, description,
  health status — *datos sensibles*, presumptively prohibited to process) and
  the poster (identity, location, relationship — personal data too).
- **Ley 1581 has no legitimate-interest balancing test**, and Colombian
  doctrine explicitly rejects "fuente de acceso público" as a consent
  substitute. U.S. scraping case law (hiQ, Meta v. Bright Data) resolves
  nothing here — it's a different statute in a different country, and ToS
  breach-of-contract exposure remains regardless.
- **Legal basis must be resolved before automated social ingestion ships**,
  via one of: (a) a data-processing agreement placing the NGO as technical
  processor for a body with Art. 10(a) legal-function standing (UNGRD, Cruz
  Roja Colombiana, Defensa Civil), or (b) written Colombian counsel sign-off
  that the flow falls under Art. 10 *urgencia médica o sanitaria*, documented
  alongside this file. The curated-paste path (§4.6) plus the WhatsApp
  tipline (reporter consents inline, in-conversation) do not wait on this.
- **Minimization for social-origin data:** store the minimum to act on a tip
  (media, extracted entities, location, source URL, timestamp) — not full
  post metadata or poster profiles; `pii-redaction` strips bystander PII
  before display outside triage. Raw payloads of non-promoted items purge on
  a 30-day default clock; poster identity persists only in `source_authors`
  (platform id + trust evidence), which is a processing record, not a
  dossier.
- **Rehosting photos from social posts** is a copyright question *in
  addition to* the data-protection one; internal evidence use is defensible,
  but re-publishing a found photo on the public site requires the standard
  human + family-consent gate like any other public display.

### 9.5 Abuse posture

- Before any new public intake surface: Turnstile reinstated (documented
  order), `ipHash` added to `addMissing`, shared rate limiting revisited
  (Valkey or Cloudflare rate-limit rules per route).
- OCR/import endpoints stay authenticated (api_keys / admin session) — no
  anonymous document upload, ever.

---

## 10. Capabilities, roles, audit

Minimize new keys (the seed is human-gated; every key here is a line in
`auth/capabilities.ts` + a manual `seedAuth()` run — **a hard deployment
dependency to schedule with the maintainer**):

| Capability | Grants | Notes |
| --- | --- | --- |
| `person:search` | family-search screens, cluster read | consider folding into existing `missing:read`+`patient:read` if the maintainer prefers zero new read keys |
| `person:review` | confirm/reject/unsure on links; import-row edit/confirm | the daily-driver reviewer key |
| `person:merge` | cluster merges, unmerge, deletion execution | small allowlist; the "senior reviewer" tier |
| `source:manage` | create/configure sources, set autopilot levels, approve trust promotions, curate the `trusted_org` allowlist, global autopilot pause | high-stakes: this key is what makes autopilot possible — same allowlist tier as `person:merge` |

`person:review` additionally covers intake triage (promote/attach/archive an
item) and reversing autopilot actions. Reused as-is: `patient:import` (batch
create/apply), `audit:read`. New audit actions:
`personlink.confirm|reject|unsure`, `cluster.merge|unmerge`,
`ocr.correction`, `person.purge`, `handoff.recorded`,
`intake.promote|archive|discard`, `autopilot.action` (with full provenance,
§4.5), `author.trust.promote|demote|suspend`, `source.pause|resume`. All
decision endpoints follow the existing chain: rate-limit → requireCapability
→ zod validate → handler → `writeAudit`.

---

## 11. Observability & quality metrics

Admin dashboard tiles + `syncRuns`-style bookkeeping:

- **Queues:** proposals pending (by band), median time-to-decision, unsure
  backlog, cluster-merge backlog.
- **Matcher:** proposals/day, confirm rate by band (a strong band confirming
  <80% means weights are lying), re-proposal rate, false-negative audit
  results (a monthly random sample of auto-filed no-matches, hand-reviewed —
  scheduled, not aspirational).
- **OCR:** per-layout-cluster correction rate (drift detector), eval-set
  accuracy per provider/prompt version, share of rows auto-valid vs
  needs-review, escalation-tier spend.
- **Sources & autopilot:** freshness/volume/error per source; autopilot
  actions per day by source and level; **sampled-audit error rate on
  autopilot-created leads** (the number that governs whether L2 stays on);
  trust promotions/demotions/suspensions; triage backlog and median
  time-in-triage; claim-cluster corroboration distribution (how much of
  intake is reshares vs independent reports).
- **Outcomes (the number that matters):** clusters reaching
  `located_*`/`resolved_reunited`, and time from report to resolution.

---

## 12. Phasing

Each phase is independently shippable and deploy-order-safe (new tables are
inert until read; schema migrations are the usual separate human step).

**Phase 0 — unblock what exists (backend + small admin UI, no new schema
except `ocr_corrections`)**
Row-level edit/confirm/reject endpoints for import rows (coordinating with the
in-flight `staging` patient-edit work); OCR rows become resolvable; PDF branch
fixed; corrections captured from day one; `ipHash` on `addMissing`; audit on
`updateMissing`; stale `db/index.ts` comment fixed.
*Acceptance: an OCR'd photo of a patient list can reach `applied` entirely
through the UI, and every hand-edit lands in `ocr_corrections`.*

**Phase 1 — identity + deterministic linkage MVP**
`person_records` (PRN) + backfill; `person_links`/`_decisions`/`_clusters`;
deterministic matcher only (document-hash exact + exact normalized name+age);
review queue v1 (side-by-side, three actions); manual link/unlink; capability
seed run.
*Acceptance: a hospital import row with a cédula HMAC matching a missing
report (via the new optional intake field or staff entry) produces a proposal;
confirming it forms a cluster visible in a person ficha; unmerge works;
everything audited.*

**Phase 2 — probabilistic matching + family search**
`person_match_keys` + extensions verified on Neon + GIN indexes; blocking
rules + FS-lite scoring + bands; búsqueda screen with facets and
cluster-grouped results; cluster-merge escalation queue; nickname table;
privacy-policy rewrite + consent copy + cédula intake field (counsel-gated).
*Acceptance: measured on a labeled sample — strong-band precision ≥95%,
review-band proposals per record bounded; search P95 < 1s at current volumes.*

**Phase 3 — OCR intelligence loop**
Derived per-field confidence (self-consistency + verifier + deterministic);
structural sanity checks; difficulty triage + provider routing behind the
provider interface; eval-set gating wired into the dev workflow; layout
clusters with few-shot memory; import review v2 (crop-beside-fields).
*Acceptance: eval-set accuracy strictly improves across two consecutive
prompt/provider iterations; per-layout correction rate visibly declines for a
repeat-sender hospital.*

**Phase 4 — connector framework core + WhatsApp tipline (human-in-the-loop
only)**
`sources` registry + connector contract; `intake_items` spine +
`item_annotations`; enrichment plumbing wiring the *existing* capabilities
(ocr, geocode, media-rehost) plus `phash` and content-hash dedup; claim
clustering v1; `source_authors` with **manually granted** trust states (no
autopilot yet — everything lands in triage); triage queue UI with the
verification checklist; curated social paste form; **WhatsApp tipline
end-to-end** (webhook → immediate media fetch to R2 → queue → enrich →
triage); source-health dashboard; official-channel handoff exports;
retention/expiry automation incl. the 30-day raw purge.
*Acceptance: a WhatsApp tip with a photo reaches the triage queue enriched
(geocoded, entity-extracted, claim-clustered) in under a minute; promoting it
creates a lead that immediately appears in the match queue against existing
records; pausing the source stops intake without a deploy.*

**Phase 5 — autopilot + new enrichments + automated social (gated)**
Evidence-gated trust promotion proposals + asymmetric auto-demotion; the
autopilot matrix live (L2 for `trusted`/`trusted_org`) with per-action
provenance audit, daily sampled re-review, and the global pause switch; new
enrichment capabilities: `entities`, `language`, `sentiment-urgency`,
`reverse-image-assist`, `pii-redaction`; corroboration-accelerated routing;
automated social connectors **only after** §9.4's legal basis is resolved and
a lawful access path exists — the framework accepts them as configuration
when they clear.
*Acceptance: a `trusted_org` author's item auto-creates a lead with zero human
touches and full provenance in `audit_log`; a fabricated-item test
auto-suspends its author on the first confirmed refutation; the sampled-audit
error rate is on the dashboard; flipping the global pause drops every source
to L1 instantly.*

---

## 13. Decisions needed from the maintainer (not resolvable by this document)

1. **Capability key set** (§10) — approve names/granularity; schedule the
   human-gated `seedAuth()` run alongside the Phase 1 migration.
2. **Legal counsel engagement** — Ley 1581 review of consent copy, cédula
   intake, public-display rules, and retention windows before Phase 2.
3. **Retention numbers** (§9.3) — 90 days post-resolution / 12 months
   inactivity are proposed defaults, not decisions.
4. **`unidentified_persons`** — revive the orphaned table as a first-class
   population (it has prod rows) or migrate its rows into a new structure and
   retire it. Phase 1 treats it read-only either way.
5. **OCR escalation provider** — pick the stronger vision tier (cost/latency
   call) for the routing in §6; the interface makes this swappable.
6. **Reviewer staffing** — who holds `person:review`/`person:merge`/
   `source:manage`; the Cloudflare Access allowlist for the panel already
   gates the outer door.
7. **Legal basis for automated social ingestion** (§9.4) — pursue a
   data-processing agreement with UNGRD/Cruz Roja/Defensa Civil, or a
   counsel-signed *urgencia* opinion? This decision gates Phase 5's social
   connectors; the WhatsApp tipline and curated paste do not wait on it.
8. **WhatsApp Business setup** — WABA registration, number, BSP-vs-direct
   Cloud API, expected message costs; portfolio-level messaging limits are a
   surge-capacity planning input.
9. **Social data access budget** — if/when a lawful path is wanted: X
   pay-per-use vs enterprise pricing, or none at all (curated intake may be
   sufficient — Meedan's tiplines were, at scale).
10. **Trust policy ownership** — who approves trust promotions and curates
    the `trusted_org` allowlist; proposed default: same allowlist as
    `person:merge`.
11. **Autopilot defaults** — the matrix in §4.5 proposes L2 ceilings for
    `trusted`/`trusted_org` only; confirm or tighten the per-action rows
    (e.g., you may want lead-creation autopilot for `trusted_org` only at
    first).
12. **Raw-intake retention** — 30-day purge for non-promoted items is a
    proposed default, not a decision.

---

## Appendix A — grounding index

| Claim | Where verified |
| --- | --- |
| No cross-table linkage anywhere | grep: patients/imports/OCR never import missing module; schema has no FK between populations |
| OCR rows unresolvable | `process.ts:196-200` (forced needs_review) vs `apply.ts:81-90` (claims only `valid`) |
| PDF 501 dead branch | `public-api/patient-imports.ts:202-224` vs `patient-import-parse.ts:36-39` |
| Zero live `db.transaction()` | repo grep; `db/index.ts:64` comment is stale |
| documentHash idiom | `schema.ts:267-284`, unique partial index |
| Queues live for imports | `backend/wrangler.jsonc:36-72`, `worker.ts:190-231` |
| Admin conventions | `admin/AGENTS.md`, `contexts/patient-imports/*`, `app/api/_shared/proxy.ts` |
| Capability seed human-gated | `worker/migrate.ts` → `seedAuth()`; project memory |
| pg_trgm/unaccent already in use | conditional `idx_missing_search` path in `services/missing.ts` |
| In-flight patient-edit work | worktree `.claude/worktrees/patient-edit` @ `staging` (`91e648f`) |

**External references:** Fellegi-Sunter & Splink (MoJ) — model, blocking,
clerical bands; PFIF 1.3/1.4 & Google Person Finder — person/note split,
expiry, status vocabulary, authoritative-source tiers; ICRC Restoring Family
Links; NLM People Locator/FaceMatch (why photo-matching is out of scope);
Ley 1581/2012 + Decreto 1377/2013, SIC guidance (incl. "public source ≠
consent" doctrine); SIRDEC/RND (Medicina Legal), UBPD Búsqueda Inversa, Cruz
Roja Colombiana RCF; Registraduría NUIP/cédula practice; Cloudflare Queues
limits & CPU changelog; 2025–26 LLM-OCR calibration and template-memory
literature; crisis-informatics prior art for the connector framework — QCRI
AIDR (hybrid ML+crowd classification, annotation-fatigue and recalibration
lessons), Ushahidi verification retrospectives (informal-trust failure mode),
Meedan Check WhatsApp tiplines (claim clustering as the routing signal,
335k+ requests), DHN/Standby Task Force + the Verification Handbook
(triangulation checklists), earthquake misinformation studies (Nepal 2015
recycled-footage cases); WhatsApp Business Cloud API docs (webhooks, 24h
window, 5-minute media URLs, portfolio-level limits); 2025–26 platform API
access reality (X pricing, Meta Content Library, TikTok Research API,
Instagram Graph API scope). (Full URL lists preserved in the research notes;
available on request.)
