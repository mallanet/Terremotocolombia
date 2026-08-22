# Runbook — Phase 0 (technical readiness)

This runbook lists prerequisites. The deployment must meet them before it
carries institutional traffic. See `docs/propuesta-erp-gobierno.md`,
Phase 0.

| # | Item | Status | Blocked by |
| --- | --- | --- | --- |
| 1 | Anti-bot protection (Turnstile) | **active in both environments**, verified 2026-08-11 | done |
| 2 | Queue worker deployed | **Cloudflare port in progress** (see below) | production cutover = human gate (G4) |
| 3 | Admin panel deployed | **deployed** (admin.terremotocolombia.co, behind Cloudflare Access) | — (see `docs/runbook-admin.md`) |
| 4 | Suppression channel (Law 1581) | **live in staging**; production waits for the seed (one human command) | capability seed in production |
| 5 | Independent security review | not started | pending |

---

## 1. Turnstile — DONE

**This step is complete, in both environments, verified 2026-08-11.**
`TURNSTILE_SECRET_KEY` is set on both API Workers (`wrangler secret list`),
and a `POST /api/missing` request with no token gets a real `403`. Seven
forms use `useTurnstile` (`frontend/hooks/useTurnstile.tsx`). Ten backend
routers use `requireHuman`.

`scripts/verify-turnstile.sh [staging|production]` checks each step. It
writes nothing to the database. The script sends a probe with an empty body.
The middleware or the validator rejects this probe. The probe never reaches
an insert. Run it any time you need to re-confirm the live state.

### History: the 2026-08-10 to 2026-08-11 outage

Turnstile was OFF in production between about 2026-08-10 and 2026-08-11:

```
production (2026-08-10)  →  site key in bundle: NO   ·  backend requires token: NO   →  consistent (off)
```

The frontend bundle did not carry the public site key, so the widget never
mounted, no token reached the backend, and `requireHuman` rejected every
report with a `403`. See `SECURITY.md` for the full timeline and the
consequence for new code.

### Sequence used to restore it (kept here for reference)

**The order of steps matters.** The wrong order is what broke missing-person
reports in the first place.

1. **[HUMAN]** Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Doppler, config `stg`.
   Get the public site key from the Cloudflare Turnstile dashboard.
2. Redeploy the staging frontend. Push a change that touches `frontend/**`.
3. Run `scripts/verify-turnstile.sh staging`. **Step 1 must pass.** If the
   site key does not appear, **stop**. The build did not pick it up.
4. **[HUMAN]** Restore `TURNSTILE_SECRET_KEY` in the staging API Worker.
5. Run `scripts/verify-turnstile.sh staging`. It must report
   `COHERENTE ... activo`.
6. Test staging manually. Send a real missing-person report from the
   browser. Confirm the response is **not** a 403.
7. Repeat steps 1 through 6 for `prd` / production.

> Step 6 is not optional. Steps 3 and 5 test configuration only. Step 6
> alone proves that a person can actually send a report.
>
> **If you ever have to redo this cycle** (for example, after a bundle
> regression breaks the site key again): fix the frontend bundle first,
> confirm the site key reaches it, and only then restore
> `TURNSTILE_SECRET_KEY` on the Worker. Restoring the secret first, before
> the bundle carries the site key, reproduces the exact outage described
> above.

---

## 2. Queue worker — not a code task

`backend/worker/index.ts` is a **long-running Node process** that uses
BullMQ. It needs Valkey/Redis. In `docker-compose.prod.yml`, it runs as its
own service (`command: ["npx", "tsx", "worker/index.ts"]`), with
`depends_on: valkey`.

**Production runs only on Cloudflare Workers today.** No container host and
no Valkey instance exist. A Cloudflare Worker cannot host this process.
Cloudflare Workers have no persistent process, and BullMQ needs a sustained
connection to Redis.

In short: *deploying the queue worker* is not a code task. It means
**standing up infrastructure that does not exist today**, at a recurring
cost.

### What this would leave inert, with no port to Cloudflare

- hub federation (`hub/`) — its flag is off, and nothing consumes its queue
- external-source sync — no `ENABLE_*` source is on today, so this stays
  pending regardless (unit U5, see below)
- scheduled maintenance (`maintenance.queue`)

Three other jobs — earthquake sync, needs publication, and patient import —
looked inert under this same logic at first. The "Decision made" section
below explains why they are not: the maintainer ported each one to
Cloudflare Queues or Cron Triggers instead of standing up the original
worker, and all three run in production today.

### Decision made: path B (Cloudflare Queues + Cron Triggers)

The maintainer chose to port the jobs to Cloudflare (KTD1 of the plan
`docs/plans/2026-08-10-002-refactor-queue-worker-cloudflare-port-plan.md`),
instead of standing up containers plus Valkey at a recurring cost. Status by
unit:

| Unit | What | Status |
| --- | --- | --- |
| U1 dispatch seam (`lib/job-dispatch.ts`) | The Queues binding wins when the deploy has one. Otherwise the code uses BullMQ with `VALKEY_URL`. With neither, it throws a clear error. | **in production** |
| U4 geocoding by Cron Trigger | `2-59/5 * * * *` | **in production** |
| — earthquakes by Cron Trigger | `*/5 * * * *` (pre-plan) | **in production** |
| U2 needs publication by Queue | queues `terremotocolombia-needs[-staging]`, `queue` consumer in `worker.ts` | **in production** (G4: forced failure → DLQ → `audit_log`, verified in both environments) |
| U3 dead-letter visibility | DLQ → `audit_log` (`queue.dead_letter`), visible on the panel's Audit screen | **in production** |
| — patient import by Queue | outside the original plan, added at the maintainer's request: queues `terremotocolombia-imports[-staging]`. The team rewrote interactive transactions as an idempotent, resumable state machine (the apply step uses a conditional claim plus a deterministic ID). The team also rewrote `roles.ts`, because role create/edit was broken in Workers. | **done** — full test suite green (375 tests), plus E2E tests in staging |
| U5 source sync by Cron | plus `/api/sync/status` semantics with no BullMQ | pending (no external source is on today: every `ENABLE_*` flag is `false`. Nothing needs sync until a maintainer turns one on.) |
| U6 remove Valkey from the Workers bundle | plus document the permanent rate limit | partial: the team documented the rate limit. `lib/queues.ts` (BullMQ) still ships in the bundle, INERT with no `VALKEY_URL`. Removing it fully needs changes to the sync routers (U5). |
| U7 `scripts/verify-jobs.sh` | verification by derived freshness | **done** |

**Production cutover (G4) = a human gate.** A human confirms the cutover by
checking `scripts/verify-jobs.sh production` after the deploy. **The backend
deploy itself is also a human gate**, separate from G4: a human must run
`deploy-backend.yml` by hand (`workflow_dispatch`), after a schema-drift
check that fails closed. This was briefly automatic for part of
2026-08-11, until a schema-drift outage (commit `a81e17c`, about 6 hours of
`503` errors) made the maintainer revert it back to manual, the same day.
The frontend and the admin panel **upload** Worker versions on push to
`main`. A human promotes the SHA (`promote-frontend.yml`,
`promote-admin.yml`). See `CLAUDE.md` → "Where this actually runs" for the
current rule.

**Out of scope on purpose**: patient import (manual and OCR). It uses
interactive transactions that fail in Workers. It needs its own separate
plan. The compose path (`docker-compose.prod.yml`) stays intact (R5).
