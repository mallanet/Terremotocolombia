# Contributing guide

Thank you for helping to improve this project. This project is the response
site for the 2026 Colombia earthquake — **terremotocolombia.co**, operated
by Mallanet.org. It has a map of reports, a directory of hospitals and
shelters, a list of collection centers, and an admin panel. The project
accepts contributions of code, documentation, tests, accessibility fixes,
performance fixes, verifiable public data, and operations work.

This is a **production deployment that serves real traffic**. It is not a
demo template. The top priority is to protect affected people and to keep
the platform running.

Read [`CLAUDE.md`](CLAUDE.md) before your first change. It describes where
this system runs, what deploys automatically, and what no one changes
without a human in the loop.

## Branches and environments

There are two branches and two environments. **Every merge triggers a
deploy.**

| Branch | Environment | Deploy behavior |
| --- | --- | --- |
| `staging` | https://staging.terremotocolombia.co<br>`api-staging.terremotocolombia.co` | automatic on merge |
| `main` | **https://terremotocolombia.co**<br>`api.terremotocolombia.co` | automatic on merge (frontend) |

A change always follows this path:

```text
work branch  ──PR──▶  staging  ──(test for real)──▶  PR  ──▶  main
```

- **Never open a PR directly against `main`.** The only way into `main` is
  a PR from `staging` that you already tested in the staging environment.
- Staging has its **own database** (a Neon branch). You can create test
  reports there without affecting the real record of missing people. Never
  create test reports in production.
- In **staging, both tiers deploy automatically** (frontend and API). This
  is the reason staging exists. If testing an API change needed a manual
  step, no one would test it. In **`main`, the backend deploy is manual**.
  A human triggers it by running `deploy-backend.yml`. A merge to `main`
  never triggers a backend deploy. When you merge to `main`, the code is
  ready, but the old API keeps serving requests until someone runs the
  workflow.
- One exception applies: a production hotfix may go directly to `main`.
  Port it to `staging` immediately afterward, so the two branches do not
  diverge.

## Before you start

- Check for an existing issue or PR on the same topic.
- For bugs, small improvements, or documentation, open an issue with the
  GitHub templates.
- For large changes to architecture, data, sync, admin, deployment, or
  critical UX, open an issue first. If needed, add a short design document
  (RFC) in `docs/`.
- Do not post personal data on GitHub. This includes private coordinates,
  phone numbers, emails, ID documents, private photos, secrets, or database
  dumps.
- GitHub is not an emergency channel. Real reports must go through the app,
  or through the coordination channels that the operator of that deployment
  defines.

## Ways to contribute

- **Bugs:** reproduce the problem, describe the impact, and attach redacted
  screenshots when they help.
- **Product improvements:** explain which user the change helps, in which
  flow, and what behavior you expect.
- **Data or external sources:** document the source, the license or
  permission, how fresh the data is, the format, any sensitive fields, and
  the deduplication strategy.
- **Documentation:** keep the English clear. Link to existing files instead
  of copying long blocks of text.
- **Security or privacy:** do not open a public issue. Report it through
  your fork's or organization's private security channel (for example,
  GitHub Security Advisories).

## Fork-first workflow

Use this workflow if you are not a maintainer with write access to the main
repository. Replace `mallanet`/`Terremotocolombia` with the real org and
repo of your deployment.

1. Fork `mallanet/Terremotocolombia` on GitHub.
2. Clone your fork:

   ```bash
   git clone https://github.com/YOUR_USERNAME/Terremotocolombia.git
   cd Terremotocolombia
   ```

3. Add the original repository as `upstream`:

   ```bash
   git remote add upstream https://github.com/mallanet/Terremotocolombia.git
   git fetch upstream
   ```

4. Create your branch from `upstream/staging`. **Do not** create it from
   `main`.

   ```bash
   git switch -c fix/short-description upstream/staging
   ```

5. Run the app. Docker Compose is the preferred method. It starts the full
   stack (frontend, admin, backend, Postgres, Valkey) without manual
   dependency installs.

   ```bash
   docker compose up --build
   ```

6. Make small, focused changes. If the scope grows, open a new issue or
   split the work into a separate PR.
7. Validate your change before you push it. Run these commands in each
   package you touched:

   ```bash
   cd frontend && npm run lint && npm run typecheck && npm run build
   cd backend  && npm run lint && npm run typecheck && npm run build
   cd admin    && npm run lint && npm run typecheck && npm run build
   ```

8. Push your branch and open a PR against **`staging`** on the main
   repository. Never open a PR against `main`. The only way to reach `main`
   is to promote `staging` after you test it.

If you are a maintainer, you may create a branch directly in the main
repository. Keep the same discipline: a descriptive branch name, a small
PR, a linked issue, and clear validation.

## Writing useful issues

Before you open an issue:

- Search open and closed issues for duplicates.
- Use the closest template: bug, improvement, or documentation.
- Include steps to reproduce, the actual result, the expected result, and
  technical context when it applies.
- Redact screenshots. Cover names, phone numbers, addresses, IDs, and
  sensitive locations.
- For security, privacy, or sensitive-data incidents, do not describe them
  in the issue. Report them through the project's private security channel.

A good issue makes these points clear:

- **Impact:** who the issue affects, and why it matters.
- **Scope:** which part of the app the issue touches.
- **Evidence:** links, redacted screenshots, logs with no secrets, or
  reproducible steps.
- **Closing criteria:** how the team will know the issue is resolved.

## Pull request expectations

Every PR must include:

- A linked issue (`Closes #123`), or an explanation of why no issue applies.
- A short description of the problem and the solution.
- Screenshots or a video if the change affects the UI.
- The validations you ran (`npm run lint`, `npm run build`, manual tests).
- Known risks and a rollback plan, if the change touches data, cache, sync,
  deployment, or public endpoints.
- Privacy or security notes, if the change adds fields, logs, analytics,
  forms, images, geocoding, or external integrations.

Keep the PR easy to review:

- Prefer several small changes over one large PR with many responsibilities.
- Do not mix cosmetic refactors with functional fixes.
- Do not upload credentials, `.env.local`, dumps, or real data.
- Rebase or update your branch if `staging` has moved far ahead before you
  merge.
- Respond to review comments with new commits. Do not resolve a comment
  thread without explaining the change.

## Code style

- Use strict TypeScript. Do not use `as any`, unless you have a clear
  justification.
- Validate all public inputs on the server side.
- Show a visible error message when a write operation fails.
- Put shared helpers in `frontend/lib/`, `backend/src/lib/`, or
  `backend/src/middleware/` before you duplicate logic.
- Make the UI accessible on mobile and desktop.
- Document new environment variables in `.env.example`.

## Creating API endpoints (REQUIRED)

The API lives in the Express backend. Public and admin routes live in
`backend/src/routes/`. The capability-authenticated surface lives in
`backend/src/public-api/`. ESLint **enforces** these rules
(`backend/eslint-rules/`, run by `npm run lint` and by CI). A rule violation
fails the PR. The hard rules are:

- **`require-rate-limit`**: every route must declare
  `rateLimit({ scope, limit })`.
- **`user-facing-mutation-needs-guard`**: every mutation in `src/routes/*`
  must carry `requireHuman` (Turnstile), or a gate (`requireAdmin`,
  `requireCapability`, `requireCron`, or `requireSupplyWrite`). If a route
  is intentionally open with no guard, document the exception with
  `// eslint-disable-next-line local/user-facing-mutation-needs-guard -- reason`.
- **`no-turnstile-in-public-api`**: code in `src/public-api/*` must not use
  Turnstile.
- **No long third-party I/O inline**: that work must go through a queue.
  The handler responds `202 {jobId}`, and the client polls status at
  `/api/sync/status`.

> **Two notes on the real current state, so testing does not confuse you:**
>
> - **Turnstile enforces on every guarded mutation, in both staging and
>   production.** A request with no valid token gets a real `403` response.
>   This is verified (2026-08-11, via `wrangler secret list`). Turnstile was
>   off, due to a site-key and bundle mismatch, from roughly 2026-08-10 to
>   2026-08-11. That bug is now fixed. See [`SECURITY.md`](SECURITY.md) for
>   the full timeline.
> - **"Queue" is still the correct pattern to write for new job types.**
>   Some specific job types now run through Cloudflare Queues, and are
>   consumed and processed in production today: needs publication
>   (`POST /api/needs`) and patient-import batches. Other job types have
>   nothing consuming them yet, because the generic BullMQ/Valkey worker is
>   still not deployed to production: external-source sync and hub
>   federation. Check the job type before you assume a `202 {jobId}` will
>   complete.
- Add a **`@swagger`** block above the first hand-written route handler.
  Routers generated by the CRUD factory document themselves from their zod
  schema.

Recommended practices: run parallel reads with `Promise.all`; use
`cached()` and `jsonWithEtag()` on public GET routes; always hash the IP
address with `hashIp`; never serialize a full object into a public response.

For full detail and examples, see `AGENTS.md`, section "Backend endpoints".

## Documentation style

- Write documentation in English, in ASD-STE100 style: short sentences, one
  meaning per word, active voice, and simple tenses.
  - One exception applies on purpose: `README.es.md` stays in Spanish,
    because it is the public site's Spanish-language landing page, not
    internal reference documentation. This policy changed on 2026-08-12;
    before that date, project documentation was written in Spanish.
- Use file names in `kebab-case.md`.
- Put the current state of the system in `docs/architecture.md`. Put the
  design system in `docs/DESIGN.md`. If the project grows, organize
  proposals and decisions into new subfolders (`docs/rfcs/`, `docs/adr/`,
  `docs/guides/`).
- Link to existing documents instead of copying long blocks of text.

## Expected conduct

This repository exists to help during an emergency. Contributors must treat
each other with respect, collaborate in good faith, and take special care
when they discuss affected people. The project does not accept doxxing,
harassment, speculation about victims, use of sensitive data to make a
point, or pressure to publish information that the project's channels have
not verified.
