# Volunteer ficha on main — what shipped and how to undo it

Shipped 2026-08-15 21:25 UTC. PR #44, merge commit **d106977**.

> **This file supersedes `HANDOFF.md` on deployment state.** Line 21 of
> that file still reads "Deployed to STAGING only. Not on main, not in
> production." That was true until the merge above and is now wrong.
> `HANDOFF.md` hit its per-session edit ceiling, so the correction lives
> here. Everything else in `HANDOFF.md` — the ficha's design, the BFF
> field allowlist, the staging access dead end — still holds.

## Blast radius, verified before the merge

The change touches `admin/**` and `docs/**`. Nothing else.

| Workflow | Fired? | Why |
| --- | --- | --- |
| Deploy admin | yes | filter `admin/**` — this is the intended deploy |
| CI | yes | runs on every push |
| Deploy frontend | no | filter is `frontend/**` + `config/deployment.config.json` |
| Deploy backend | no | `workflow_dispatch` only, always manual |

`infra/db/` is untouched, so there is **no migration** and the schema
does not move. The only artifact that changed is the Worker
`terremotocolombia-admin`.

Post-deploy checks, all 200: admin.terremotocolombia.co/api/health,
terremotocolombia.co/, api.terremotocolombia.co/api/readyz.

## Rollback, one step

```bash
git revert -m 1 d106977
git push origin main
```

The revert touches `admin/**` again, so `deploy-admin.yml` runs by
itself and republishes the previous panel. Expect it to take about a
minute, ending on its own smoke check against `/api/health`.

Nothing else needs undoing: no schema to migrate back, no secret to
restore, no other Worker touched. The public site never changed.

If GitHub is unavailable, the same result comes from Actions →
"Deploy admin" → Run workflow, from commit `1d3265f` (the state before
this change).

## What to look at in production

admin.terremotocolombia.co → `/volunteers` → button **Ficha** on any
row. Production sits behind Cloudflare Access first, then the panel
login.

## Known gap this did not solve

`admin-staging` has no seeded account, so the staging panel could not
be opened for review. Details in `HANDOFF.md`. Review happened on the
local stack (http://localhost:3001, admin@example.org /
localadminpass123 — dev values from `docker-compose.yml`) plus proof
that the deployed staging bundle carried the ficha literals.
