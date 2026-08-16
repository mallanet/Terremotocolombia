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
figures move. Green: backend 731, frontend 148, admin 164.

BLOCKER: staging and main hold different schemas
staging is ahead of main by two migrations that never reached production:
0010_furry_marauders (official deceased lists) and 0011_query_observability
(PR #45). The campaign migration is also 0010 (0010_wide_lionheart),
because this branch starts from main. Merging into staging conflicts in
_journal.json and meta/0010_snapshot.json. The merge was aborted, nothing
was touched.
The number is not the real problem: any numbering bets on merge order.
Rebasing on staging would drag those two unrelated features into the PR to
main. Maintainer decides. Recommended: land what staging already has on
main first, then renumber the campaign one.

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

WORKERS AUDIT OF THE CAMPAIGN CODE, 2026-08-16: CLEAN
The failure that broke roles.ts in production (an interactive
db.transaction, which compiles, passes locally under node-postgres, and
fails only in Workers) is not present. No `db.transaction(` call exists in
backend/src/**; only comments mention it.
registerReceipt claims the pledge with one atomic conditional UPDATE
(WHERE id = ... AND status = 'pledged' ... RETURNING) and compensates if
the receipt insert fails after it. That is the required idiom.
No campaign path is in lib/json-edge-cache.ts, thus no authenticated
response can enter the edge cache.

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

BANNER OF THE CAMPAIGN LANDING, 2026-08-16
/reconstruccion opens with CampaignHero.tsx: the frame of the home page
hero (.e-hero*), but its own image, set inline in the component and not in
styles/shell-layout.css — that file serves the whole house, and changing
its background would change the home page too.
The image is public/campana/hero.jpg: construction material, no people,
generated for this banner and compressed to 246 KB at 1920 px. The veil is
one flat layer, bg-slate-950/62. To show more or less of the photograph,
change that one number.

PHOTOGRAPH REFUSED, ON PURPOSE
The maintainer sent a press photograph of the earthquake (file name matches
the New York Times asset pattern) to use as the banner. It did NOT enter
the repository, for two independent reasons: it shows identifiable affected
people, which CLAUDE.md forbids without exception, and it is a third
party's copyrighted work. Any replacement must clear BOTH bars.

PHOTO IN THE DONATION FORM AND IN THE DELIVERY: BUILT, ONE PIECE LEFT
The maintainer chose: photo only (no video), and only the team sees it —
no public wall, thus no moderation screen to build.
Done: an optional photo on the pledge form (/reconstruccion) and on the
point steward screen. Both reuse `persistPhotoDataUrl()` (R2 when
configured, data URL in the column when not) and `usePhotoUpload()`, which
redraws the image on a canvas — that re-encode DROPS THE EXIF, so the GPS
coordinates of the phone never reach the server. No new code for that.
Size ceiling is MAX_REPORT_PHOTO_CHARS, the same one the reports use.
Verified against the local stack: a pledge with a photo stores it, and
GET /api/campaign/certificado/<code> does NOT return it. The steward inbox
does not return it either. Test rows deleted after.
LEFT TO DO, ONE EDIT: the panel does not show the photo yet, because
services/campaign/admin-pledges.ts needs `photo` in its columns and DTO,
and campaign-models.ts needs the column. That file was outside the declared
file map of the turn, so it was not touched.
VIDEO STAYS OUT: it does not fit the base64-through-JSON path that every
form here uses. It needs a direct upload to R2 with a signed URL.

MIGRATION 0011, WRITTEN, NOT APPLIED OUTSIDE LOCAL
infra/db/migrations/0011_campaign_photos.sql adds `photo` to
material_pledges and to material_receipts. Additive, nullable, with IF NOT
EXISTS: old code ignores the columns, so it can be applied BEFORE the code
that uses them, which is the order AGENTS.md demands. Applied to the LOCAL
database only. Neon staging and production are untouched.
It sits on top of the 0010 numbering that is already in dispute — see the
BLOCKER above. Same decision, now two files instead of one.

OPEN
docs/architecture.md is 663 lines and the local size gate refuses to grow
it, so neither the ficha nor the campaign is linked from it. Maintainer
decides.
No automatic email with the donation code: the code shows on screen only.
Shipments (material_shipments) are created by hand in the panel; there is
no public tracking screen.

HARNESS NOTE
Declare the FILE_MAP as plain text on its own line, like
FILE_MAP: edit:HANDOFF.md
Two ways this was rejected in one session: a tag written as prose inside
backticks, and an expansion announced mid-turn after tools had already
run. The gate reads only the declaration that opens the turn. Declare
every path you may touch, HANDOFF.md included, before the first tool.

NEXT
Maintainer decides the migration numbering, then: apply the migration
against Neon direct, run deploy-backend.yml, grant the `campaign`
capability, create the points and their stewards.
