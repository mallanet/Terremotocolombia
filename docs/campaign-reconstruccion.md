# Reconstruction campaign

The campaign collects construction material at points in several cities and
sends it to Chocó. This document gives the full flow, what the site promises
to the public, and which steps a human must do by hand.

## The flow, end to end

```mermaid
flowchart LR
  donor(["The person who donates"]) -->|"form at /reconstruccion"| pledge["material_pledges\nstatus: pledged\nunique code"]
  pledge -->|"brings the material and says the code"| steward(["Point steward"])
  steward -->|"/reconstruccion/punto/&lt;token&gt;"| receipt["material_receipts\n+ pledge -> received | partial"]
  receipt --> balance["/api/campaign/balance\nreceived vs pledged"]
  receipt --> cert["/reconstruccion/certificado/&lt;code&gt;\nverified"]
  admin(["The team, in the panel"]) --> shipment["material_shipments\nbatches to the destination"]
  shipment --> balance
```

There are three figures, and only one counts as truth:

| Figure | What it means | Source |
| --- | --- | --- |
| **Received** | Material that a team member saw and confirmed | `material_receipts` |
| **Pledged** | A promise. It can fail to arrive | `material_pledges` with status `pledged` |
| **In transit** | It left the point, on its way to the destination | `material_shipments` |

The landing page shows the three figures separately. It never adds them
together. To add them makes a promise into a fact. On the day that one half
does not arrive, the public figure becomes a lie.

## What each part does

| Route | Who enters | Purpose |
| --- | --- | --- |
| `/reconstruccion` | anyone | See the points and the balance, pledge a donation |
| `/reconstruccion/certificado/<code>` | the person who has the code | See and verify the certificate (`noindex`) |
| `/reconstruccion/punto/<token>` | the steward of a point | Confirm deliveries (`noindex`) |
| `/construccion` | anyone | Permanent redirect to `/reconstruccion` |
| Panel → Campaign | the team, with the `campaign` capability | Points, stewards, pledges and batches |

## Certificate

The code comes from `pledge-code.ts`. It has ten characters, from an alphabet
without `0/O` and without `1/I/L`. People say this code on the telephone, and
read it from a photograph made against the light in a warehouse.

A certificate starts as **pending**. It becomes **verified** only when a
person at the point confirms the delivery. A certificate that said "verified"
at the moment a person fills in a form has no value: anyone can write that
they will bring one hundred bags of cement.

## Point steward

Create a steward in the panel (Campaign → Point stewards). The system gives
the token **one time only**, in an amber box. The database keeps only its
hash, thus you cannot read the token again. Send it through a private
channel. The link is `/reconstruccion/punto/<token>`.

The token always goes in the `x-campaign-steward-token` header, never in the
query string, thus it does not go into the edge logs.

To remove a person: delete their steward in the panel. The link stops to work
at the next request.

## Before the first deployment

1. **Apply migrations `0012` and `0013`** against Neon **direct** (not
   `-pooler`), as their own step, before the backend deployment. `0012` makes
   five new tables and `0013` adds two nullable `photo` columns; neither one
   changes an existing table. The campaign branch numbered these `0010` and
   `0011` until the merge with `main`, which already held those numbers.
   Without them, all of `/api/campaign/*` answers `503`, and the remainder of
   the site continues to operate. In `stg` no direct variable exists, so
   derive it:
   `doppler run --project terremotocolombia-web --config stg --command 'bash scripts/migrate-direct.sh DATABASE_URL'`
2. **Deploy the backend by hand** (`deploy-backend.yml`). The schema-drift
   gate passes when the migration is applied.
3. **Grant the `campaign` capability** to the role that operates the campaign.
4. **Make the points** in the panel, each with its hours and public contact.
   Without points, the landing page shows the form but does not tell people
   where to deliver.
5. **Make one steward per point** and send each link.

No deployment does these steps for you, and an agent does not do them on its
own initiative (see `CLAUDE.md`).

## Staging status, 2026-08-17

Steps 1 and 2 are done in staging. Migrations `0012` and `0013` are applied to
the Neon `staging` branch through the direct endpoint, `check:schema-drift`
answers clean, and run `32059821930` of `deploy-staging.yml` is green for the
API, the panel and the frontend. Do not migrate staging again: both files are
recorded in the journal and a second run changes nothing.

Step 3 is done too. `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set in
Doppler `stg`, the seed reported `superadmin … creado (activo)`, and a login
against `POST /api/public/auth/login` on the staging API answers `200`. Read
the password back at login time; both variables can go once you no longer need
to recreate the account.

```bash
doppler secrets get SEED_ADMIN_PASSWORD -p terremotocolombia-web -c stg --plain --no-check-version
```

Steps 4 and 5 are open. The campaign holds no data yet —
`/api/campaign/puntos` answers `{"sites":[]}` — so the landing page shows the
form and no place to deliver. Make the points in the panel first, then one
steward per point.

Two traps on the way. `-c stg` is the flag to get right, because `prd` is
production. And `--no-check-version` is not optional on a machine without
`gpg`: without it the CLI tries to update itself, fails the signature check,
and exits `3` **before running your command**, which reads like a permission
error and is not one.

## Production status, 2026-08-17

The campaign is live on terremotocolombia.co. Migrations `0012` and `0013` are
applied to the Neon `production` branch through the direct endpoint
(`ep-super-haze-…`, no `-pooler`), `check:schema-drift` answers clean, and the
five tables exist with `photo` on `material_pledges` and `material_receipts`.
PR #47 merged as `375d5b4`, and the three deploy workflows are green: frontend
and panel on their own, the API through a manual dispatch of
`deploy-backend.yml`. `/api/campaign/puntos` and `/api/campaign/balance` answer
`200` against production, both empty.

Card contributions are ON with a **live** Stripe key. Two parts make that
true, and each one alone does nothing: `ENABLE_STRIPE_DONATIONS` in the
top-level `vars` of `backend/wrangler.jsonc`, and the `STRIPE_SECRET_KEY`
secret on the `terremotocolombia-api` Worker. Version `ae372fbe` carries both.
Doppler `prd` keeps a copy of the key for the record, but **no workflow pushes
Doppler onto a Worker**: a change there reaches nothing until somebody runs
`wrangler secret put`.

Set that value with care. The first attempt stored the key with a newline
inside it, because the closing quote sat on the next line of the shell. It was
harmless that day, since the Worker copy was typed at the prompt, and it was
rewritten clean. A newline inside an HTTP header breaks the call, so the check
is `doppler secrets get … --plain | wc -l`, which must answer `1`.

**No Stripe webhook exists.** Charges, and monthly renewals, leave no record in
our database: the Stripe dashboard is the only ledger, and a cancellation
asked by email is done there by hand. This is a deliberate choice, taken to
launch. Building the webhook is what closes it.

Open: make the collection points and one steward per point in the panel
(capability `campaign`, already on the `admin` role). Roll the live key in
Stripe once the flow is verified — it was printed in plain text on the
maintainer's terminal while it was being set.

## Personal data

- The donor contact (`donor_contact`) is private. It goes to no public
  endpoint, only to the panel.
- The donor wall is **explicit opt-in**. If the box is not ticked, the system
  keeps no alias, thus there is nothing to publish, not even by accident. Only
  a person with a confirmed delivery appears there.
- A suppression request (Law 1581) **anonymizes** the pledge: it removes the
  name, the contact and the alias, and keeps the material and the date. It
  does not delete the row, because that material is already counted in a
  public figure and supported by a certificate
  (`services/campaign/anonymize.ts`).
- If the pledge write fails, the system captures it in `failed_submissions`
  before it answers `503`. Drain that table by hand — see `AGENTS.md`.

## Why snapshots 0012 and 0013 repeat 0011

`drizzle.config.ts` reads `schema.ts`, and `schema.ts` does not import
`schema-campaign.ts`. Thus drizzle-kit never sees the campaign tables, and the
two campaign migrations are hand-written. This is deliberate: a snapshot that
declared those tables would make the next `db:generate` propose to DROP each of
them, because the schema drizzle reads does not have them.

But `check:migration-journal` asks for one snapshot per journal entry, and with
good reason: a missing snapshot makes the next generated migration repeat
changes that are already applied. So `0012` and `0013` hold the same content as
`0011` — the state of `schema.ts`, which those two migrations did not change —
with their own `id` and a correct `prevId` chain. The proof that this is right:
`npm run db:generate` answers "No schema changes".

Do not regenerate these two files against a schema that includes the campaign
tables. If those tables must come under drizzle-kit one day, the step is to
import them in `schema.ts` and generate a new migration, never to edit a
snapshot that is already in the chain.

## Files

```text
infra/db/schema-campaign.ts        The five tables
infra/db/migrations/0012_*.sql     Campaign tables (hand-written, additive)
infra/db/migrations/0013_*.sql     Photo columns (hand-written, additive)
backend/src/lib/campaign-materials.ts   Material catalog
backend/src/services/campaign/     Services (public, steward and panel)
backend/src/routes/campaign*.ts    Public and steward routes
backend/src/public-api/resources/campaign-*.resource.ts   Panel CRUD
frontend/app/(content)/reconstruccion/   Landing, certificate and point
frontend/components/features/campaign/   Campaign components
admin/src/contexts/models/registry/campaign-models.ts   Panel registration
```
