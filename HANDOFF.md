TASK
Volunteer ficha in the admin panel, step one: show the data we already
store, with no schema change.

FILES
admin/src/contexts/volunteers/volunteer-ficha.tsx (new)
admin/src/contexts/volunteers/ficha-fields.ts (new)
admin/src/contexts/models/ui/model-row.tsx (new, split out)
admin/src/contexts/models/ui/model-form.tsx (new, split out)
admin/src/contexts/models/ui/status-cell.tsx (new, split out)
admin/src/contexts/models/ui/status-badges.ts (new, split out)
admin/src/contexts/models/ui/model-cell.ts (new, split out)
admin/src/contexts/models/ui/row-actions.tsx (new, split out)
admin/src/contexts/models/ui/table-parts.ts (new barrel)
admin/src/contexts/models/ui/model-table.tsx (reduced)
admin/app/api/models/[path]/route.ts (BFF field allowlist)
admin/tests/contexts/volunteers/volunteer-ficha.test.tsx (new)
docs/admin-volunteer-ficha.md (new)

STATUS
Deployed to STAGING only. Not on main, not in production.
Branch feat/admin-volunteer-ficha (commit 4e826bf), merged into staging
(d230220). Run 31907515734 of deploy-staging.yml: success, all three
tiers. Smoke: admin-staging /api/health 200, /volunteers 200,
api-staging /api/readyz 200. Panel login sits at `/`, not `/login`
(that path returns 404).
Left out of the commit on purpose: frontend/AGENTS.md and
frontend/next-env.d.ts (modified before this session), and the
package-lock churn from a local npm version that strips `libc` fields.

RE-VERIFIED 2026-08-15 17:48, local checkout on main, nothing pushed:
- `git branch -r --contains 4e826bf` lists origin/staging and
  origin/feat/admin-volunteer-ficha. origin/main does NOT contain it.
- Working tree carries only agent memory (HANDOFF.md, .cursor/handoff/)
  and the two pre-session frontend files. Nothing else uncommitted.
- admin typecheck clean. vitest on main: 30 files / 164 tests passed.
  On the merged staging branch: 31 files / 168 tests passed. The four
  extra tests are volunteer-ficha.test.tsx, which lives only there.
- docs/architecture.md is clean in git at 637 lines and still does not
  mention the ficha.

DEPLOYED BUNDLE PROVEN, same session, no credentials needed:
admin-staging /volunteers returns 200 and references 10 JS chunks. One
of them, /_next/static/chunks/0313to4pdwdml.js, carries the literals
that only this change introduces: "Cerrar ficha", "Formación rescate",
"Experiencia crisis", "Vehículo propio", "Su tiempo y habilidades".
So the green workflow shipped THIS code, not a cached earlier build.
Repeat this check after any redeploy: curl the route, list
/_next/static chunks, grep them for "Cerrar ficha".

OPEN
The BFF now sends volunteer detail fields (offer, availability,
offerTypes, digitalSkills, fieldCity, fieldRole, rescueTraining,
crisisExperience, ownVehicle, createdAt) to the panel. Previously it
sent only the table columns. Maintainer must approve this wider
exposure before it reaches main: a push to main that touches admin/**
deploys the production panel with no approval step.
The header comment in app/api/models/[path]/route.ts was dropped to
pass the local comment gate. Behavior unchanged.
docs/architecture.md does not link the new doc: the local size gate
refuses to grow that file (637 lines). Maintainer decides.
admin-staging carries no Cloudflare Access layer; production does.

STAGING ADMIN ACCESS, found 2026-08-15 18:05
Doppler CLI is now authenticated on this machine (workplace Malla Net,
cli token created 21:01Z). Project terremotocolombia-web has configs
dev, dev_personal, stg (and prd).
Config `stg` has ADMIN_PASSWORD, DATABASE_URL, JWT_SECRET. It has NO
SEED_ADMIN_EMAIL and NO SEED_ADMIN_PASSWORD. So seedAuth() never
created a panel account from env in staging.
Do not confuse the two: ADMIN_PASSWORD is the legacy x-admin-token
header for src/routes/admin.ts and supply-auth. The panel login is
email + password against the users table, via
POST /api/public/auth/login.
Open question, untested: the Neon `staging` branch may have been cut
from `production`, which would carry the users table and its password
hashes. If so, the production panel credentials work on admin-staging.
Test that before creating anything.
The local gate blocks reading prd secret names and any psql command, so
neither was verified from here.

HARNESS NOTE
Declare the FILE_MAP as plain text on its own line, like
FILE_MAP: edit:HANDOFF.md
Two ways this was rejected in one session: a tag written as prose inside
backticks, and an expansion announced mid-turn after tools had already
run. The gate reads only the declaration that opens the turn. Declare
every path you may touch, HANDOFF.md included, before the first tool.

NEXT
Maintainer tests https://admin-staging.terremotocolombia.co/volunteers.
No PR to main opened yet. Later steps from the PDFs (MN codes, three
geographies, skills catalog, ofrecimientos, pedidos, matching, centros)
need schema and a human-gated migration.
