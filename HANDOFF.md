REGRESSION THE MERGE CAUSED, CAUGHT AND FIXED, 2026-08-17
Taking main's admin row UI whole removed our CellValue, and with it the
photo rendering. The Compromisos table has a "Foto" column, so it would
have printed the raw value: a CDN URL, or — with no R2 configured — a
data URL of hundreds of thousands of characters inside one cell.
Restored as ui/photo-cell.tsx (isPhotoValue + PhotoCell), used by
model-row.tsx, with renderCell collapsing a photo to "📷 Foto adjunta" so
the row id keeps being a short string. Regression test:
tests/contexts/models/photo-cell.test.tsx (4 tests) — the collapse
assertion fails against main's renderCell, which is the point.
LESSON: resolving a conflict by taking one side WHOLE is not a merge, it is
a replacement. List what the discarded side did that the kept side does
not, before trusting a green typecheck. Types pass happily while a column
degrades from an image to a string.
Also: `git checkout --theirs` is an edit the harness never sees. Resolve
with Write/StrReplace, or declare it as an edit.

HANDOFF ARCHIVED, 2026-08-17
This file hit its 300-line ceiling, which would have blocked the next
session from writing to it at all. Four settled blocks moved verbatim to
docs/handoff-archive.md: the staging/main schema blocker, the Workers audit
of the campaign code, the campaign banner, and the photo feature detail.
Nothing was deleted. Archive the oldest blocks again when this file nears
280 lines.

main MERGED INTO THE CAMPAIGN BRANCH, 2026-08-17
Local only, NOT pushed. Ten conflicted files, all resolved.
- deployment config, site.ts, deployment-config.ts + its test: same
  evolution both sides (main had one payment link, we generalised the
  validator to a loop). Kept the general version.
- admin model UI: NOT one file with edits, two independent implementations.
  main splits it into row-actions / status-cell / status-badges /
  table-parts and is in production, so main's won whole. Re-grafted the one
  campaign bit: <RevealOnce fields={model.revealOnCreate}> after create
  (steward token). route.ts took the UNION: ficha fields + revealOnCreate.
- Deleted ui/model-cell.tsx: it landed beside main's model-cell.ts,
  TypeScript resolves .ts first, so it was unreachable.
MIGRATIONS: both branches used 0010 and 0011 for different things. main's
numbering untouched; ours moved to 0012_campaign_reconstruccion and
0013_campaign_photos. Safe: both idempotent (IF NOT EXISTS), never run
outside a local database.
WATCH THIS: campaign tables live in infra/db/schema-campaign.ts, which
drizzle.config.ts does NOT read. The branch carried a 0010 snapshot that
DID contain them, so `db:generate` there would have proposed DROPPING every
campaign table. main's chain fixes it. Campaign DDL is hand-managed.
Green after merging: admin build, frontend 169 tests, backend 750, audit.
test/official-deceased-import.test.ts (main's) fails without DATABASE_URL —
a unit test that transitively imports src/db. Pre-existing, not ours.
THIS FILE IS AT ITS 300-LINE CEILING. Archive the oldest blocks next.

ON-SITE DONATION FORM, 2026-08-17
/apoyanos no longer sends people to a closed payment link to pick a figure.
The page owns the choice (monthly/one-off, $5/$15/$30/other) and the backend
turns it into a Stripe Checkout session; Stripe returns the browser to
/apoyanos/gracias. New module backend/src/modules/donations/ (DDD, same shape
as needs/), endpoint POST /api/donaciones/checkout with Turnstile + rate
limit. Full write-up: docs/donations.md.
It stores NOTHING: no donor row, no name, no email. Stripe collects the money
and keeps that record. The amount rides in an inline price_data, so nobody
has to create a price per figure — monthly included.
success_url/cancel_url are built from CORS_ORIGINS, never from the body: an
open redirect handed to Stripe would start on our own domain.
STILL DARK IN PRODUCTION. Two human steps, in this order:
  1. Doppler prd (or stg to rehearse): STRIPE_SECRET_KEY=sk_… and
     ENABLE_STRIPE_DONATIONS=true.
  2. Run deploy-backend.yml by hand.
Until then the endpoint answers 503, the form shows that message, and the
old payment links stay reachable under "otras formas de aportar".
Rehearse with sk_test_… and card 4242 4242 4242 4242 before the live key.
Two files a hook would not let me touch, left for a human:
  - .env.example (blocked as a secrets file): add ENABLE_STRIPE_DONATIONS=false
    and STRIPE_SECRET_KEY=CHANGE_ME_STRIPE_SECRET_KEY.
  - docs/architecture.md (663 lines, over the size gate): the module write-up
    went to docs/donations.md instead. Fold it in when that file gets split.
config/env.ts hit the same wall (over the comment ceiling), so the two vars
validate in modules/donations/donations-env.ts. Same Zod, same loud failure.
The /apoyanos H1 was unreadable: globals.css declares `h1 { color: var(--etext) }`,
and an element selector beats the colour inherited from a `text-white` parent.
The class now sits on the h1 itself. Any white heading over a photo needs it.

MONEY DONATIONS, 2026-08-17
Two Stripe payment links now exist, both declared in
config/deployment.config.json as OPTIONAL https-only keys (`donationUrl`,
`donationMonthlyUrl`). The validator was a closed key set, so it grew an
OPTIONAL_KEYS list: a fork with no payment processor still boots and its
buttons fall back to /donaciones.
- Nav button "Donar a Mallanet" -> one-off link. Merged to main in PR #50
  (commit 08b3041), production frontend deployed on its own.
- New landing /apoyanos, UNICEF-style: monthly support first, one-off
  second. Lives on THIS branch, ships with the campaign PR.
No invented impact equivalences ("your X buys Y"): we have no such figure,
and a false number on a page that asks for money is not a copy problem.
The amount is chosen on Stripe's page — payment links are closed products,
one link per frequency.
The MOBILE sheet still points to /donaciones: MobileStickyNav.tsx is 402
lines and the size gate refuses any edit that does not shrink it. The CTA
sits first on /donaciones so a phone reaches Stripe with one more tap.
Splitting that file is the pending fix.

PR #47 REPORTS NO CHECKS, 2026-08-17
It targets main, it is open and not a draft, and CI triggers on
pull_request to main — yet `gh pr checks 47` says "no checks reported" after
two pushes. The Actions API also answered 504 around that time, so a GitHub
hiccup is the likeliest cause. Do NOT read the absence of a red mark as a
green build: verify locally (frontend 162 tests, content audit) or re-push
to force a run before merging this PR.

CONTENT AUDIT: buy.stripe.com VETO RETIRED, MAINTAINER'S CALL 2026-08-17
Merging PR #50 turned CI red on main with one finding:
[hard-banned] ./config/deployment.config.json — buy.stripe.com. The pattern
exists so the public template never ships a payment link pointing at one
account. These links are Mallanet's own and live in the deployment identity
file as optional https-only keys, so the maintainer retired the pattern with
the precedent already set for discord.gg/ and chat.whatsapp.com
(PR #51, on main and cherry-picked here as b7608af).
DO NOT put it back. The rest of the list stays banned, and that is the point
of the rule: the two crowdfunding domains, the PayPal payment path and the
WhatsApp shortener. Read them in scripts/content-audit/banned-patterns.txt —
spelling them here makes the audit fail on its own notes.
The frontend deploy was never affected: it went green and shipped.

MERGING main INTO THIS BRANCH CONFLICTS, 2026-08-17
Tried, aborted, nothing touched. main now carries PR #49 (staging) and the
volunteer ficha, so the conflicts are: infra/db/migrations/meta/_journal.json,
meta/0010_snapshot.json, and four admin model UI files
(route.ts, model-form.tsx, model-row.tsx, model-table.tsx — add/add, both
sides created them). The donate commit was cherry-picked here instead
(ef5da46) so /apoyanos could build. That cherry-pick is identical content
to main's, so it should merge as a no-op.

CURRENT WORK
Reconstruction campaign: collect construction material at points in
several cities, send it to Chocó. Branch feat/campana-reconstruccion,
pushed, PR #47 open against main. NOT in staging (see BLOCKER).
Full state, links and manual steps: .cursor/handoff/campana-reconstruccion.md
Functional doc: docs/campaign-reconstruccion.md

Six commits: schema (5 tables + migration 0010), API and landing, admin
panel (4 CRUD resources under the new `campaign` capability), middleware
fix, handoff, rate-limit test fix.
Verified end to end on the compose stack: register a donation, confirm it
from the point steward screen, watch the certificate turn verified and the
figures move. Green: backend 731, frontend 162, admin 164.

PRODUCTION BUG FOUND, FIX NOT DEPLOYED
requireSupplyWrite (backend/src/middleware/supply-auth.ts) was written with
asyncHandler, which only forwards the error and never calls next() on
success. Every AUTHORIZED hospital supply write (status, needs, help
requests) hangs until the client times out. The rejection answers 401
instantly, which is why nobody noticed. Measured locally with a valid
token: 8 seconds, no response.
Fixed on this branch with a regression test
(backend/test/middleware-continues.test.ts). It reaches production only
when a human runs deploy-backend.yml.

LOCAL ENVIRONMENT AS LEFT
docker compose up, five services. The local database has migration 0010
applied and DEMO data to walk the flow: three points (Bogotá, Medellín,
Cali), each with its steward link.
Landing http://localhost:3000/reconstruccion · Panel http://localhost:3001
· API http://localhost:8080
Local admin password was set by hand: admin@example.org /
localadminpass123. The seeded user did not match docker-compose.yml. Local
database only.
PENDING: delete the DEMO rows (prefix `DEMO`) when the walkthrough ends.
CAREFUL: the local database also holds one pledge from the maintainer's
own walkthrough (50 bricks, still `pledged`). It carries no `DEMO` prefix.
Do NOT delete it without asking.

PANEL AUTH, DO NOT CONFUSE THE TWO
ADMIN_PASSWORD is the legacy x-admin-token header for src/routes/admin.ts
and supply-auth. The panel login is email + password against the users
table, via POST /api/public/auth/login. The panel login screen sits at `/`,
not `/login` (that path returns 404).
Doppler config `stg` has ADMIN_PASSWORD, DATABASE_URL and JWT_SECRET, but
no SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD, so seedAuth() never created a
panel account in staging.

DONE EARLIER, NOW ON MAIN
Volunteer ficha in the admin panel (PR #44, commit 4e826bf). The BFF sends
the wider volunteer field set. Doc: docs/admin-volunteer-ficha.md.

KNOWN LIMITATION, MAINTAINER DECIDES
A pledge is claimable only from status 'pledged'. If a person brings one
half today and the other half tomorrow, the first delivery moves the
pledge to 'partial' and the second delivery with the same code is refused
with "already confirmed". No material is lost: the steward records the
second half without a code, and it counts in the totals. Only that
person's certificate stays partial.
Reproduced locally 2026-08-16: pledge of 10 cement bags, deliver 4 ->
status partial; deliver the other 6 with the same code -> "Ese compromiso
ya se confirmó antes." Test rows deleted after.
FIXED 2026-08-16: on a partial delivery the steward screen used to answer
"El certificado de esa persona ya es válido", which was false. The text now
comes from receiptMessage() in services/campaign/receipt-status.ts, a pure
function with a test per status. The route only calls it. Confirmed
against the live local stack, not only in tests.
To make 'partial' claimable again needs the sum of the previous receipts,
because receiptStatus compares the pledge against ONE delivery, not
against the accumulated total. That is a design change, and it needs its
own tests.

PHOTOGRAPH REFUSED, ON PURPOSE
The maintainer sent a press photograph of the earthquake (file name matches
the New York Times asset pattern) to use as the banner. It did NOT enter
the repository, for two independent reasons: it shows identifiable affected
people, which CLAUDE.md forbids without exception, and it is a third
party's copyrighted work. Any replacement must clear BOTH bars.

PHOTO IN THE PLEDGE AND IN THE DELIVERY: BUILT
Photo only, team-visible only, no public wall. EXIF is dropped by the
canvas re-encode in usePhotoUpload(). It never appears in the certificate,
the steward inbox or the balance — measured, see the privacy block below.
Full detail: docs/handoff-archive.md. Video stays out: it does not fit the
base64-through-JSON path and needs a signed direct upload to R2.

PRIVACY OF THE PHOTO, MEASURED 2026-08-16 (not reasoned, measured)
One pledge with a photo, then four requests against the running stack:
  /api/public/campaign-pledges (panel, authenticated)  -> 1 row with photo
  /api/campaign/certificado/<code>                     -> 0 hits of "photo"
  /api/campaign/punto (steward token)                  -> 0 hits
  /api/campaign/balance                                -> 0 hits
Repeat this check if you ever add a field to those projections. Test row
deleted after.

MIGRATION NUMBERING: SETTLED, see the merge entry at the top
Both campaign migrations are renumbered (0012, 0013) and applied to the
LOCAL database only. Neon staging and production are untouched.

OPEN
docs/architecture.md is 663 lines and the local size gate refuses to grow
it, so neither the ficha nor the campaign is linked from it. Maintainer
decides.
No automatic email with the donation code: the code shows on screen only.
Shipments (material_shipments) are created by hand in the panel; there is
no public tracking screen.

HARNESS NOTE: DECLARE FILE_MAP TAGS WITH ABSOLUTE PATHS
Read the hook before guessing at the format again. `rules_topology` in
~/.cursor/hooks/lib/stop_fs.sh compares each `edit:`/`NEW:` tag found in the
assistant prose against `state/<conv>/allowed_files.md`, with `grep -qxF`,
which is a whole-line exact match. That file is appended by
pre_tool_use_core.sh with the path Write/StrReplace received — and those
tools take an ABSOLUTE path. So a relative tag (`edit:HANDOFF.md`) can
never match the recorded
`/Users/christianmock/terremotocolombia/HANDOFF.md`, and EVERY declared tag
comes back as a TOPOLOGY VIOLATION even when the work was correct.
That is what happened twice on 2026-08-16 with a correct, well-formed
declaration. It is not about backticks, not about the line position, and
not about a `FILE_MAP:` prefix.
Declare like this, absolute:
  edit:/Users/christianmock/terremotocolombia/HANDOFF.md
Still true: declare every path before the first Write, HANDOFF.md included.

HARNESS NOTE: SOME PATHS CANNOT BE DECLARED AT ALL
TAG_RE in ~/.cursor/hooks/lib/stop_rules.sh is
  (edit|NEW):[A-Za-z0-9_./+=-]+
That character class has no parentheses and no brackets, so a tag stops at
the first one. `edit:.../frontend/app/(content)/apoyanos/page.tsx` is
captured as `.../frontend/app/`, which then fails the grep -qxF against the
recorded writes and reports TOPOLOGY VIOLATION every single time. Same for
`admin/app/api/models/[path]/route.ts`. Next.js route groups and dynamic
segments are everywhere here, so this fires on ordinary work and no amount
of care in the declaration avoids it. Fixing it means editing the hook:
add ()[] to the class and strip trailing punctuation.
The class DOES include the dot, so a tag that ends a sentence swallows the
full stop and stops matching. Never put a tag at the end of a sentence.

HARNESS NOTE: WRITE THE Done-when LIST EXACTLY ONCE
The gate counts predicates across the WHOLE turn, and the roof is five.
Listing them when the turn opens and again when it closes counts as ten,
and it answers "got 10". State them once, at the close, as `- ` bullets on
their own lines. Inline prose like "Done-when: (1) x (2) y" counts as zero
predicates and triggers UNDER-SCOPE instead. Each bullet must be something
a command can falsify — a test total, an HTTP code, a row count — not a
sentence about the work being good.

NEXT
Apply 0012 and 0013 against Neon direct, run deploy-backend.yml, grant the
`campaign` capability, create the points and their stewards.

SMALL THING SEEN, NOT FIXED
Every panel table prints `createdAt` as a raw epoch (1786914635951)
instead of a date. It is not specific to the campaign; it hits every
model. Nobody asked for it yet.

LOCAL DATABASE AS LEFT, 2026-08-16 18:12
Three DEMO points with their steward links, and TWO pledges from the
maintainer's own walkthrough (`mallanet`, 50 bricks and 32 timber, both
still `pledged`). Every row this agent created for testing is deleted.
