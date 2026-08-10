# GEO / SEO skill (project-local)

Vendored from [zubair-trabzada/geo-seo-claude](https://github.com/zubair-trabzada/geo-seo-claude) into [`.claude/skills/geo/`](../.claude/skills/geo/) so any agent opening this repo can run GEO audits without a global install.

## Layout

| Path | Role |
|------|------|
| `.claude/skills/geo/SKILL.md` | Main orchestrator (`/geo audit`, `/geo quick`, …) |
| `.claude/skills/geo/skills/geo-*/` | Sub-skills (citability, crawlers, schema, …) |
| `.claude/skills/geo/agents/` | Agent prompts (also copied to `.claude/agents/geo-*.md`) |
| `.claude/skills/geo/scripts/` | Optional Python helpers (needs local `.venv`) |

Upstream license: `.claude/skills/geo/LICENSE.upstream`.

## How agents should run an audit

1. Prefer the **live** site when TLS works: `https://terremotocolombia.co`
2. If prod TLS is down, audit a **local prod build**:
   ```bash
   cd frontend && npm ci && npm run build && npm run start -- -p 3456
   ```
   Then analyze `http://127.0.0.1:3456` (HTML/metadata/robots/sitemap/JSON-LD are the same as deploy; canonical URLs still point at `terremotocolombia.co` via `config/deployment.config.json`).
3. Full audit = five parallel lenses: AI visibility, platforms, technical, content, schema — then synthesize into `docs/geo/audit-YYYY-MM-DD.md`.
4. **Do not** treat blocked AI *training* bots in `frontend/app/robots.ts` as a bug. Humanitarian policy: allow live retrieval bots; disallow training crawlers.

## Optional Python venv

```bash
python3 -m venv .claude/skills/geo/.venv
.claude/skills/geo/.venv/bin/pip install -r .claude/skills/geo/requirements.txt
```

`.venv` is gitignored.
