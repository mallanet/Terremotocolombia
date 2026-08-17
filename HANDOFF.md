CI WAS RED FOR TWO COMMITS: THE SNAPSHOTS THE RENUMBERING LOST, 2026-08-17
Renumbering the campaign migrations to 0012/0013 left both entries in the
journal with NO snapshot in meta/, and check:migration-journal gates every
PR, so nothing could merge to main. Staging was never affected: the tables
were already applied there.
The fix is not the obvious one. schema.ts does not import schema-campaign.ts,
so drizzle-kit never saw the campaign tables and both migrations are
hand-written. A snapshot that DID declare them would make the next
db:generate propose DROPPING every one. So 0012 and 0013 carry 0011's
content — the state of schema.ts, which neither migration changed — each with
its own id and prevId chained to the one before. Proof it is right:
`npm run db:generate` answers "No schema changes".
Written up in docs/campaign-reconstruccion.md so nobody regenerates them
against the wrong schema. The gate refuses to edit a 6.360-line JSON by
hand, which is correct: those files are generated, so generate them.

SEO/GEO OF /apoyanos AND /reconstruccion, 2026-08-17
/reconstruccion emitted no page-level markup at all — only the breadcrumb and
the global organisation. Both pages now carry WebPage + FAQPage, and the
campaign also an ItemList of collection points with address, coordinates and
accepted material (lib/jsonld-campaign.ts).
Two rules that hold for anything added later:
- The FAQ text shown and the FAQ text marked up come from ONE array. A
  FAQPage that does not match the visible page is deceptive markup.
- Only OPEN points enter the ItemList. Structured data outlives its cache,
  and sending someone with a load of cement to a closed door is worse than
  saying nothing.
llms.txt mentioned neither page; it now lists both plus a five-line summary
of the campaign. Answers promise no impact equivalence and no tax benefit,
and a test blocks reintroducing either.
Already fine, do not "fix": robots.ts blocks AI TRAINING bots and allows the
live retrieval ones, /construccion 308-redirects to /reconstruccion, and the
certificate and steward screens are noindex.
STILL GENERIC: both pages share og-v2.jpg as their social card.

DONATION CARD FOLLOWS THE CHOSEN FREQUENCY, 2026-08-17
The heading promised a monthly commitment even to someone who had picked a
one-off gift, because it lived in SupportDonateCard (server) while the choice
lives in DonateForm (client). The heading moved into the form and each
frequency has its own wording in donate-copy.ts. Button says "Dona ahora".

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

MOBILE DONATION CTA, PENDING
The payment-link history is in docs/handoff-archive.md; the live path is the
on-site form below.
The MOBILE sheet still points to /donaciones: MobileStickyNav.tsx is 402
lines and the size gate refuses any edit that does not shrink it. The CTA
sits first on /donaciones so a phone reaches Stripe with one more tap.
Splitting that file is the pending fix.

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

LOCAL ENVIRONMENT AND DATABASE AS LEFT
docker compose up, five services. Landing localhost:3000/reconstruccion ·
Panel localhost:3001 · API localhost:8080. Local admin set by hand:
admin@example.org / localadminpass123 (the seeded user did not match
docker-compose.yml). Local database only.
It holds 0012 and 0013 applied, three DEMO points with their steward links,
and TWO pledges from the maintainer's own walkthrough (`mallanet`, 50 bricks
and 32 timber, both still `pledged`). Those two carry no `DEMO` prefix: do
NOT delete them without asking. Every row this agent created is deleted.
PENDING: delete the DEMO rows when the walkthrough ends.

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

MIGRATION NUMBERING: SETTLED, see the snapshot entry at the top
0012 and 0013 are applied to the LOCAL database and to the Neon STAGING
branch, through the direct endpoint. Production is untouched.

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

HARNESS NOTE: THE ROUTE-GROUP TAG BUG IS FIXED
TAG_RE in ~/.cursor/hooks/lib/stop_rules.sh stopped at the first parenthesis
or bracket, so `(content)` and `[path]` paths could never be declared. The
class now carries ()[] and trailing punctuation is stripped. Full history in
docs/handoff-archive.md.

HARNESS NOTE: WRITE THE Done-when LIST EXACTLY ONCE
The gate counts predicates across the WHOLE turn, and the roof is five.
Listing them when the turn opens and again when it closes counts as ten,
and it answers "got 10". State them once, at the close, as `- ` bullets on
their own lines. Inline prose like "Done-when: (1) x (2) y" counts as zero
predicates and triggers UNDER-SCOPE instead. Each bullet must be something
a command can falsify — a test total, an HTTP code, a row count — not a
sentence about the work being good.

NEXT
Staging is complete and green: migrations applied, superadmin seeded, Stripe
on a test key. Create the points and their stewards in the panel — with none,
/api/campaign/puntos answers {"sites":[]}, the landing shows no place to
deliver and the ItemList stays out of the markup.
For PRODUCTION, in this order: migrate Neon direct, run deploy-backend.yml,
put the live Stripe key in Doppler prd, grant the `campaign` capability.
NO STRIPE WEBHOOK EXISTS: nothing records a completed charge on our side.
Decide before the live key — build it, or account for the money outside.

SMALL THING SEEN, NOT FIXED
Every panel table prints `createdAt` as a raw epoch (1786914635951)
instead of a date. It is not specific to the campaign; it hits every
model. Nobody asked for it yet.

STRIPE IN STAGING, AS LEFT
Test key only (sk_test_), set with `wrangler secret put` on
terremotocolombia-api-staging and mirrored in Doppler stg. The flag lives in
backend/wrangler.jsonc under env.staging.vars, because ENABLE_STRIPE_DONATIONS
parses with z.coerce.boolean(): the string "false" would read as TRUE, so to
turn it off you REMOVE the variable, never set it to false.
