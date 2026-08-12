# Admin panel

The admin panel manages the emergency map. It is a standalone Next.js
microservice, separate from the public site. The browser calls the panel's
own BFF (`app/api/*`) at the same origin. The BFF forwards each call to the
backend over the internal network.

## Requirements

- Node >=24

## Start the panel

```bash
npm install
npm run dev        # development
npm run lint
npm run typecheck
npm run test
npm run build
```

## Structure

```
admin/
├── app/      # Next App Router: pages + BFF (app/api/*)
├── src/      # contexts (DDD), shared (auth/http), ui (atoms), config
└── tests/    # vitest
```

## Deployment and access

The panel runs as a Cloudflare Worker in both environments
(`admin.terremotocolombia.co` and `admin-staging.terremotocolombia.co`). It
uses the same OpenNext pattern as the frontend (`wrangler.jsonc` plus
`open-next.config.ts`). Cloudflare Access protects production (one-time
passcode by email, checked against a team allowlist).

- Daily operation (user creation, roles, data uploads, known issues):
  **`docs/runbook-admin.md`**.
- Deployment rules (both staging and production deploy automatically, with
  no approval step, since 2026-08-11): **`CLAUDE.md`**.
- Local development against a remote API:

```bash
COOKIE_SECURE=false EMERGENCY_API_URL=https://api-staging.terremotocolombia.co npm run dev
```

`COOKIE_SECURE=false` is required. Without it, the browser does not set the
session cookie over http://localhost.
