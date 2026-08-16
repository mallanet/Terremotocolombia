# AGENTS.md — frontend map

**Parent map:** `../AGENTS.md`

## Scope

This package uses Next.js 16 and React 19. It builds the public UI and runs
server-side rendering (SSR). It also keeps a legacy `/admin` screen. This
screen is separate from the standalone `../admin/` service. This package does
not access the database directly. This package does not own the public API.

## Where to look

| Task | Location | Notes |
|------|----------|-------|
| Routes and metadata | `app/` | Uses the App Router. Content groups live under route groups. |
| Legacy admin | `app/(admin)/admin/` | Uses an admin token stored in the browser. |
| Feature UI | `components/features/` | Domain-oriented visual modules. |
| Shared layout and UI | `components/layout/`, `components/ui/` | Reuse these before you add new primitives. |
| Client data | `hooks/` | TanStack Query queries and mutations. |
| Browser HTTP | `lib/api.ts` | Holds the absolute backend URL. Includes `mediaUrl()`. |
| Server HTTP | `lib/server-api.ts` | Makes SSR calls through the internal or public backend URL. |
| Visual source of truth | `../docs/design/DESIGN.md` | Read this before you change public visuals. |
| Tests | `tests/unit/` | Uses Vitest. |
| Next version docs | `node_modules/next/dist/docs/` | Use this for Next 16 APIs. |

## Done (local)

`TOOLCHAIN.md` does not exist in this repository. For the frontend's lint,
typecheck, and build commands, see the "Useful commands" section of the root
`AGENTS.md`. If your change ships a UI update, also run `npm run build`.

## Hard stops (this package)

- This package has no direct database access. This package adds no routes
  under `app/api/**`. The backend owns the `/api` surface.
- App code calls the API through `lib/api.ts` or through a hook. SSR code
  calls the API through `lib/server-api.ts`. Only public third-party
  overlays, such as RainViewer, may fetch directly from the browser.
- Relative photo URLs must pass through `mediaUrl()`.
- Public mutations that handle sensitive data must keep Turnstile, through
  `useTurnstile()`.
- Do not duplicate TanStack Query's cache or polling with an ad-hoc fetch
  loop.

## Ask first

- Changes to public report types or to real-time polling behavior.
- New analytics, new user-visible sensitive fields, or new collection of
  personal data.

## Manual notes

<!-- Preserved on refresh -->

- Visual source of truth remains `../docs/DESIGN.md`.
- shadcn/ui is initialized in this package: see `components.json` and
  `../docs/design/shadcn.md`. Prefer shadcn primitives for new forms/dialogs;
  do not rewrite the `.e-*` shell in the same change as a feature.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
