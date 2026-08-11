---
title: "feat: Notificaciones y suscripciones para eventos entrantes"
type: feat
date: 2026-08-11
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# feat: Notificaciones y suscripciones para eventos entrantes

## Goal Capsule

**Objective.** Close the pull-only gap: today every inbound citizen submission
lands in a table and waits for a human to *think to open the right screen*.
Build one generic, table-driven notification substrate — wired to two event
types on day one — that pushes a content-free alert to the right people and
keeps a delivery record durable enough to prove a Ley 1581 request was surfaced
in time.

**Authority hierarchy.** `AGENTS.md` governs code conventions. `CLAUDE.md`
governs deploy and ops. This plan governs sequencing and the decisions under Key
Technical Decisions.

**Execution profile.** Land on a work branch, merge to `staging`, verify against
`api-staging.terremotocolombia.co` and the Neon `staging` branch, then merge
`staging` → `main`. Note that since 2026-08-11 all three deploys are automatic
on push to `main` — a merge *is* a production release.

**Stop conditions — get a human.** Running migrations and the capability seed;
touching Doppler or Worker secrets; deciding **who** goes on a `configured_list`
for a legally-clocked event; any change to Ley 1581 posture or the privacy
policy.

*Discharged 2026-08-11:* the Cloudflare Queue creation gate. The maintainer
authorised it and the four queues now exist (see KTD8), so the
`wrangler.jsonc` declaration in U4 can merge without failing the deploy.

**Tail ownership.** The implementing agent owns through "verified on staging."
A maintainer owns the production migration/seed and the recipient lists.

---

## Product Contract

### Summary

A notification substrate with two recipient-resolution modes — capability fanout
for routine events, an explicitly configured recipient list for events with a
legal or life clock — delivering content-free emails that link into the admin
panel. Immediate send for clocked events, a batched digest for the rest. Every
send is a row with an idempotency key and a delivery status, swept by a cron
that alerts when something never landed.

### Problem Frame

Nine event types write a row that a human is expected to act on. **Zero of them
notify anyone.** The volunteer form shipped 2026-08-11 made this concrete: the
form had been silently discarding registrations, and once fixed, the
registrations simply became rows nobody is told about. Fixing the form moved the
failure from "data lost" to "data unattended" — better, but not solved.

Two of these events are materially worse than "someone waits longer":

- **`data_deletion.requested`** (Ley 1581) carries a statutory response clock.
  There is **no deadline field and no cron anywhere in the codebase** — a grep
  for `1581` hits documentation only. Today the only thing standing between the
  project and a missed statutory deadline is somebody remembering to look.
- **`missing.found_claimed`** flips a missing person to "found" — i.e. removes
  them from the public search surface. It is unmoderated; only a 2/min rate
  limit sits in front of it. Nobody is told when it happens.

The team is small, unpaid, and its membership changes under pressure — which is
exactly when a system that depends on humans remembering to configure themselves
fails silently.

### Requirements

1. An inbound event of a subscribed type results in a notification attempt
   without any human having opted in first.
2. No personal data of a citizen appears in any outbound message body.
3. A notification attempt is recorded with an outcome, durably, and is
   queryable later to answer "were we told, and when?"
4. A notification that never reached anyone produces an alert rather than
   silence.
5. Delivery never blocks or slows the citizen's submit request.
6. Duplicate delivery is bounded — at-least-once transport must not produce
   unbounded repeat sends.
7. Recipient resolution for legally-clocked events does not depend on RBAC
   membership drifting.

### Scope Boundaries

**In scope (v1):** the `notifications` table and migration; the emit seam; both
resolution modes; the queue consumer that sends; the digest cron; the delivery
sweep + alert; a read-only delivery log in the admin panel; two event types
wired (`volunteer.registered`, `data_deletion.requested`).

**Explicitly out of scope, deferred not forgotten:**

- WhatsApp or any non-email channel. The content-free body is what makes adding
  one later cheap — no per-channel Ley 1581 review — but it is not v1.
- A self-service subscription-preferences UI. v1 has no per-user opt-in.
- Citizen-facing subscriptions ("notify me when my report is resolved"). That is
  a new PII surface with its own consent and unsubscribe obligations.
- The remaining seven event types. They are wired only after the first two have
  run clean through a real incident.
- Adding a statutory deadline field to `data_deletion_requests`. Flagged as an
  open question — it is a legal-posture decision, not an engineering one.

---

## Planning Contract

### Key Technical Decisions

These were resolved by an LLM Council run (Contrarian / First Principles /
Expansionist / Outsider / Executor, anonymous peer review, chairman synthesis)
on 2026-08-11. Where the council split, the reasoning is recorded.

**KTD1 — Build the generic table now; wire two event types.**
The `notifications` table is the one artifact that is genuinely hard to reverse:
once Ley 1581 delivery depends on its shape, changing it is painful. Get the
shape right once, table-driven, even though only two event types populate it at
first. *Council note:* all five peer reviewers independently flagged "build the
whole general engine now" as the biggest blind spot in the set — this is the
narrow middle, not the maximalist build.

**KTD2 — Two resolution modes, chosen by stakes.**
`capability` fanout (notify everyone holding `<resource>:read`) for routine
events; `configured_list` (an explicit, human-maintained recipient list) for
events with a legal or life clock. *Council note:* this is the one place the
chairman sided with the dissent against the majority lean. Fanout encodes *who
may see this*, not *who is accountable for acting on it*. Those bits usually
coincide, which is what makes it dangerous when they don't: revoke someone's
capability for an unrelated access reason and their notification coverage
silently goes to zero, with no signal — during exactly the membership churn this
team has. Fanout is still correct for the routine majority, where over-notifying
beats a new coordinator hearing nothing.

**KTD3 — Content-free bodies, always, from day one.**
Subject + count + a link into the panel. No name, no phone, no case detail. The
panel already sits behind Cloudflare Access in production; routing PII around
that wall into inboxes — forwarded, screenshotted, retained forever — defeats a
control that already exists. This also matches both existing email templates in
`backend/src/auth/mailer.ts`, which are PII-free by construction.

**KTD4 — Immediate for clocked events, digest for the rest.**
The bottleneck is human attention, not delivery latency. Immediate per-event
email on a `report.submitted` or `missing.reported` surge turns a useful signal
into a firehose people learn to ignore — which reintroduces the original problem
wearing a different hat. Digest interval is an open question (see below).

**KTD5 — Idempotency by conditional UPDATE, not transactions.**
Interactive transactions do not work on Workers (Neon HTTP driver). Cloudflare
Queues are at-least-once. The claim is therefore a single atomic statement —
`UPDATE notifications SET status='sending' WHERE id=$1 AND status='pending'` —
and only a claimed row is sent. This is the same idempotent-claim pattern
already used by patient imports (`services/patient-imports/apply.ts`), so it is
precedent, not invention. *Council note:* four of five reviewers converged on
this independently as the thing all five advisors missed.

**KTD6 — "SMTP accepted it" is not "a human was notified."**
Every notification carries a `delivery_status`, and a cron sweep alerts on
anything still `pending`/`failed` past a threshold. Without this, an unmonitored
pipeline just relocates the blind spot. It matters most for the content-free
legal notice, which is precisely the message whose absence nobody can notice.

**KTD7 — Email only in v1.** No WhatsApp. See Scope Boundaries.

**KTD8 — A dedicated queue, and it already exists.**
Reusing `NEEDS_QUEUE` would have avoided an infra step but coupled notification
retry/backoff to a queue tuned for an unrelated job — the kind of coupling that
stays invisible until it misbehaves during an incident. The maintainer authorised
creation on 2026-08-11 and these four now exist on the account (verified with
`wrangler queues list`):

| Environment | Queue | DLQ |
| --- | --- | --- |
| production | `terremotocolombia-notifications` | `terremotocolombia-notifications-dlq` |
| staging | `terremotocolombia-notifications-staging` | `terremotocolombia-notifications-dlq-staging` |

Binding: `NOTIFICATIONS_QUEUE`. Suggested consumer params, following the
imports pair (one notification per message, retries spaced): `max_retries: 3`,
`max_batch_size: 1`. Creating the queue is the *only* part that needed a human —
the `wrangler.jsonc` declaration is now an ordinary code change.

**KTD9 — Recipients are staff, not citizens.**
v1 resolves to rows in `users` (the RBAC/staff table). No new citizen PII
surface, no new consent/unsubscribe obligation. `users` has no preferences
column and should not grow one — resolution is computed, not stored per user.

**KTD10 — `notification` goes in `MODELS`, not `CROSS_CUTTING`.**
It is a real data model with its own table, following the `volunteer` precedent
added 2026-08-11. `buildCatalog()` auto-produces
`notification:read|create|edit|delete`. **This requires a human seed run** — see
Risks.

### Assumptions

1. **The production Worker can send email today.** *Verified 2026-08-11* by
   `wrangler secret list` against the prod API Worker: `SMTP_HOST`, `SMTP_PORT`,
   `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` are all present, and invitation
   emails send automatically. **`docs/runbook-admin.md:37` ("Producción no tiene
   SMTP") is stale and should be corrected.** Note that Worker secrets never
   appear in `wrangler.jsonc` — checking config is the wrong probe, and produced
   a false negative during research for this plan.
2. Nodemailer works under `nodejs_compat` in Workers — implied by invitations
   sending in production, not separately load-tested.
3. Reusing an existing queue avoids the human `wrangler queues create` gate; a
   dedicated queue does not. See Open Questions.
4. Event volumes are qualitative, inferred from per-route rate limits, not
   measured. `report.submitted` (20/min) and `missing.reported` (10/min) are the
   plausible firehoses.

---

## High-Level Technical Design

```
  citizen POST                    (unchanged, never blocked)
        │
        ▼
  services/<domain>.ts  ──emit──▶  services/notifications.ts
                                        │  INSERT notifications (status=pending,
                                        │  idempotency_key, event_type, subject_ref)
                                        ▼
                              ┌─────────────────────────┐
                              │  resolution (at send)   │
                              │  capability │ config    │
                              └─────────────────────────┘
                                        │
              immediate (clocked)       │       digest (routine)
                    │                   │              │
              dispatchJob ──────────────┘              ▼
                    │                            Cron Trigger
                    ▼                          (groups pending by
            Queue consumer  ◀────────────────── type, one email)
                    │
         claim: UPDATE ... WHERE status='pending'
                    │
                    ▼
              mailer.ts  ──▶  content-free email + panel link
                    │
                    ▼
        UPDATE delivery_status (sent | failed)
                    │
                    ▼
        Cron sweep: anything pending/failed past threshold → alert
```

Emission is a plain INSERT on the citizen's request path — cheap, no network
call, no blocking. Everything after that is asynchronous. Recipient resolution
happens **at send time, not at emit time**, so a membership change between the
two resolves to current reality.

Note that `ctx.waitUntil` is *not* reachable from Express route handlers in this
codebase (`httpServerHandler` from `cloudflare:node` does not thread
`ExecutionContext` into the Node server), which is why the existing async
pattern uses a Queue. This plan follows that precedent rather than fighting it.

---

## Implementation Units

### U1. `notifications` table + migration

New table in `infra/db/schema.ts`, drizzle-generated migration `0003_*`.
Columns: `id`, `event_type`, `subject_ref` (the row this is about),
`resolution_mode` (`capability` | `configured_list`), `target_ref` (the
capability key or the list key), `status` (`pending`|`sending`|`sent`|`failed`),
`delivery_status`, `idempotency_key` (unique), `attempts`, `created_at`,
`sent_at`, `last_error`. Indexes on `(status, created_at)` and
`(event_type, created_at desc)`; unique index on `idempotency_key`.
**No PII columns** — `subject_ref` is an id, not a name.

Additive only, `IF NOT EXISTS`. Human runs the migration.

### U2. Emit seam

`backend/src/services/notifications.ts` — `emitNotification(input)`, a single
INSERT with a deterministic `idempotency_key` (`<event_type>:<subject_ref>`) and
`onConflictDoNothing`, so a retried request cannot double-emit. No transaction.
Called from `services/volunteers.ts` and `services/data-deletion.ts` only.

Emission must never fail the citizen's request: wrap in a try/catch that logs
and swallows. A lost notification is bad; a citizen unable to file a
missing-person report because the notifier hiccupped is worse.

### U3. Recipient resolution

`resolveRecipients(event_type)` returning staff emails.
- `capability` mode: query `users` joined through roles/grants for holders of
  the target capability, `status='active'` only.
- `configured_list` mode: read the list. Storage for the list is the smallest
  open question — a config table row or a Doppler value; prefer the DB so a
  maintainer can change it without a deploy.
- **Empty-list health check:** a `configured_list` resolving to zero recipients
  is an alertable condition, not a no-op. This is the specific failure the
  council flagged: coverage silently dropping to zero produces no signal.

### U4. Delivery via queue consumer

Producer: `dispatchJob(notificationsRoute, { notificationId }, { id: idempotencyKey })`.
Consumer: extend the `queue()` handler in `backend/src/worker.ts` /
`classifyQueue()` in `lib/queue-consumer.ts`.

Consumer logic: conditional claim (KTD5) → resolve recipients → render
content-free body → send via `auth/mailer.ts` → record outcome. On throw, let
the queue retry; the DLQ already persists to `audit_log` via
`persistDeadLetter`.

### U5. Digest cron

New Cron Trigger. Groups `pending` rows of digest-mode event types by
`event_type`, sends one email per type per recipient ("3 registros nuevos de
voluntarios"), marks them sent in one conditional UPDATE per row. Idempotent and
safe to re-run, like the existing crons.

### U6. Delivery sweep + alert

Cron pass over `status IN ('pending','sending','failed')` older than the
threshold. Emits an alert (email to the configured operations list, and an
`audit_log` row `action: "notification.stalled"`). Records go to `audit_log`
without recipient contact details — `audit_log.metadata` is unstructured `jsonb`
gated by one broad `audit:read`, so it is not a place for PII.

### U7. Admin surface

Read-only delivery log so the team can answer "were we told?". Follows the
generic `[model]` table (`admin/src/contexts/models/model-registry.ts`) —
columns: event type, subject, status, delivery status, created. `canDelete:
false`, no `createFields`. Editing the `configured_list` is a small bespoke
surface or, for v1, a documented SQL/runbook step.

Note the frontend registry is *not* a mirror of backend `MODELS` — it has no
`pet` entry and does include `deletion-requests` (a `CROSS_CUTTING` key). Do not
assume a new backend model auto-appears correctly shaped.

### U8. Verification harness

`scripts/verify-notifications.sh [staging|production]` in the shape of the
existing `verify-jobs.sh`: asserts recent notifications exist, none are stalled
past threshold, and every `configured_list` resolves non-empty. Read-only.

---

## Verification Contract

- Emitting twice for the same subject produces exactly one row
  (`idempotency_key` unique).
- A forced double-delivery of the same queue message sends exactly one email
  (conditional claim holds).
- A citizen submit still succeeds when the notifier throws.
- No outbound body contains a citizen name, phone, or case detail — assert
  against the rendered template in a test, not by eyeball.
- An empty `configured_list` raises an alert instead of silently sending
  nothing.
- A `failed` row past the threshold appears in the sweep alert.
- Backend/frontend/admin typecheck, lint and full test suites green.

---

## Definition of Done

Two event types live in production; `volunteer.registered` delivering on the
digest path and `data_deletion.requested` delivering immediately to a
configured list; a stalled notification demonstrably produces an alert; the
delivery log visible in the panel; `verify-notifications.sh production` green;
`docs/runbook-admin.md:37` corrected; `docs/architecture.md` updated.

---

## Phase Gates

| Gate | Condition |
| --- | --- |
| G1 → staging | U1–U4 landed; migration + seed run on staging; one real emit delivers end-to-end |
| G2 → staging | U5, U6 landed; a forced failure produces a sweep alert; empty-list check proven |
| G3 → production | Maintainer runs migration + seed on prod, sets the `configured_list`, then merge to `main` |
| G4 → close | One real incident has passed with no stalled notification; only then wire event types 3+ |

---

## Risks & Dependencies

| Risk | Mitigation |
| --- | --- |
| **Capability seed is human-gated.** `notification:read` does not exist in the DB until a human runs `migrate.ts` (which calls `seedAuth`). Until then any `requireCapability("notification:read")` denies everyone. | Same release runbook as the volunteers slice: migrate **before** deploying the code that reads it. Note the seed admin bypasses capability tables entirely (`auth/resolve.ts` returns `"*"` for `isSystemAdmin`), so a system admin will see it regardless — do not use that as proof it works for others. |
| ~~A new Cloudflare Queue needs `wrangler queues create` before the declaration merges~~ | **Resolved 2026-08-11** — all four queues created (KTD8). |
| **Only 2 of 5 prod accounts are actually usable.** `e.muth.martinez@` and `mmbtc90@` are `active`; `mockraw@` and `mariopulice21@` are still `invited` (never activated) and `+hospitales@` is `disabled`. A fanout that does not filter `status='active'` would "send" to three people who cannot log in — coverage that looks fine and is not. | U3 filters `status='active'`. The empty-list alert then means what it says. |
| Notification volume becomes its own firehose. | KTD4 digest; thresholds tunable without a deploy. |
| Nodemailer under Workers is proven only by invitation traffic. | Validate on staging under a burst before G3. |
| `configured_list` goes stale as the team changes. | Empty-list alert (U3) catches the zero case; it does **not** catch "wrong person listed" — that stays a human review item. |
| PII creeping into bodies later. | Assert it in tests (Verification Contract), not just in review. |

---

## Open Questions

1. ~~**Which queue?**~~ **Closed 2026-08-11** — dedicated queue, created. See KTD8.
2. **Digest interval.** 15 min? 30? Hourly? Wants one real crisis of data to
   answer honestly. Start at 30 min, make it config not code.
3. ~~**Who is on the `configured_list` for Ley 1581?**~~ **Decided 2026-08-11 by
   the maintainer: Eduardo Muth Martínez (`e.muth.martinez@gmail.com`) and
   Marian (`mmbtc90@gmail.com`).** Both are `active` admin accounts today, so
   both can actually open and resolve a request — no provisioning needed and
   nothing blocks implementation. Christian Ríos was the maintainer's first
   choice and was set aside for now because he has no account (see note below);
   add him later by appending to this list, which is precisely the property KTD2
   was chosen for.
4. **Should `data_deletion_requests` gain an actual statutory deadline field?**
   There is none today, so "overdue" cannot currently be computed — only "old".
   Adding one is a legal-posture decision. Until then the sweep can only alert
   on age, which is weaker than the law's actual test.
5. **Does `missing.found_claimed` deserve promotion into v1?** It is an
   unmoderated flip that removes a person from public search behind only a
   2/min rate limit. It was scoped out to keep v1 to two event types, but it has
   a better safety argument than `volunteer.registered`.

---

## Note — adding a third name later (e.g. Christian Ríos)

Nothing blocks implementation, but when the list grows, remember a name on it is
only worth something if that person can walk through the door the notification
links to. A content-free email is useless to someone who cannot log in, and two
names where one cannot act reads as coverage while being a single point of
failure.

Adding a person therefore means three things, not one:

1. A panel account (invite + role). Minimum useful role for this job is
   `deletion:read` + `deletion:edit` — full `admin` is more than the task needs.
2. Their email on the **Cloudflare Access allowlist** for
   `admin.terremotocolombia.co`. Production is behind email-OTP at the edge, so
   without this they never reach the panel login. Both layers are required —
   `docs/runbook-admin.md` → "Alta de un usuario nuevo".
3. Only then, append them to the `configured_list`.

Christian Ríos was the maintainer's initial pick on 2026-08-11 and was deferred
for exactly this reason: prod `users` has no row matching `%rios%`/`%christ%`.
Creating accounts, editing the Access allowlist and sending invitations are
access-provisioning and outward-facing actions — maintainer's call, per
`CLAUDE.md`, not an agent's.

**Unrelated but found the same day:** `mockraw@gmail.com` and
`mariopulice21@gmail.com` are both still `invited` — the invitations were never
activated (Mario's was issued 2026-08-11 with a 72 h expiry, so it has likely
lapsed). Two teammates may believe they have panel access and not have it.

## Sources & Research

- Council verdict (5 advisors, anonymous peer review, chairman synthesis),
  2026-08-11 — architecture, v1 boundary, and the idempotency/observability
  blind spot.
- Codebase research sweep, 2026-08-11 — event inventory with write sites, queue
  and cron inventory, admin placement, authz constraints. **One correction
  applied:** the sweep concluded the Worker could not send email, having probed
  `wrangler.jsonc` for SMTP vars; Worker secrets do not appear there.
  `wrangler secret list` against prod confirms all five SMTP secrets present.
- `CLAUDE.md` — deploy/ops authority, Workers transaction limitation, human
  gates. `AGENTS.md` — code conventions.
- Precedent: `docs/plans/2026-08-10-002-refactor-queue-worker-cloudflare-port-plan.md`
  (queue + cron patterns, DLQ-to-`audit_log`), and the volunteers slice shipped
  2026-08-11 (capability minting + human seed runbook).
