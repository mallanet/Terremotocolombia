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
