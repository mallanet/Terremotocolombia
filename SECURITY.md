# Security

This document covers two separate topics. The first topic is how to report
a vulnerability in the **template code**. The second topic is what it means,
in terms of security and privacy, to **operate a real deployment** built
from the template. If you found a problem in a specific deployment, and not
in this template repository, contact the operator of that deployment
directly. This template has no visibility and no control over third-party
forks.

## Report a Vulnerability

**Do not open a public issue.** This repository is public. An attacker can
exploit any detail about a real vulnerability as soon as it becomes public.
This is especially true for a vulnerability that exposes data about people
in crisis.

- Report the vulnerability through the repository's private security
  channel: GitHub Security Advisories. Go to the "Security" tab, then
  select "Report a vulnerability".
- The security contact for this deployment is in `contactEmail`, in
  `config/deployment.config.json`. Today this value is
  **`info@mallanet.org`**. This is not a placeholder. It is a real address,
  and the team monitors it. If you fork this template for another
  deployment, replace this address with your own. Use an organization
  address, never a personal address. Do this before you operate the fork in
  production.
- Include the affected endpoint, file, or flow. Include the concrete
  impact: does it expose PII? Does it allow an unauthenticated write? Does
  it bypass the rate limit? Include steps to reproduce the problem. You do
  not need a complete exploit. Give enough detail for the team to confirm
  the vulnerability.
- Give the team a reasonable time to fix the vulnerability before any
  public disclosure (coordinated disclosure). If the team does not respond
  within a reasonable time, you may escalate the report. Tell the team
  first, before you escalate.

## Security Posture of the Template

The template already includes these controls. A deployer does not need to
build them from scratch.

- **Rate limiting on every route.** Every backend endpoint declares
  `rateLimit({ scope, limit })`. This applies to the public surface
  (`backend/src/routes/*`) and the authenticated surface
  (`backend/src/public-api/*`). This is a strict rule. ESLint **enforces**
  the rule (`require-rate-limit`, in `backend/eslint-rules/index.js`). This
  ESLint rule runs in `npm run lint` and in CI. No comment can bypass this
  rule. Valkey backs the rate limit when the deployment configures Valkey.
  Without Valkey, the rate limit falls back to an in-memory counter inside
  each process. This fallback is degraded, but it is not absent.

  > **Status on terremotocolombia.co: degraded mode.** The
  > `terremotocolombia-api` Worker has no Valkey. So the counter lives in
  > memory, per isolate. Cloudflare runs many isolates. This makes the
  > effective limit much more permissive than the declared number. One
  > rate limit is real and shared: the edge rate limit. This is a
  > Cloudflare rule on the zone.
- **Human verification on public writes (Cloudflare Turnstile).** Every
  public-facing mutation (`backend/src/routes/*`) requires `requireHuman`,
  a single-use Turnstile token. Or it requires an equivalent gate:
  `requireAdmin`, `requireCapability`, `requireCron`, or
  `requireSupplyWrite`. ESLint also **enforces** this rule
  (`user-facing-mutation-needs-guard`). When `TURNSTILE_SECRET_KEY` is not
  set, `requireHuman` turns itself off. This is intentional, for local
  development. But in production, this variable **must** be present.
  Otherwise public writes have no anti-bot verification.

  > **STATUS ON terremotocolombia.co (verified 2026-08-11): ACTIVE.**
  > `TURNSTILE_SECRET_KEY` is set on the API Worker (confirmed with
  > `wrangler secret list`). A `POST /api/missing` request with no token
  > gets a **403** response. So the verification is truly active.
  >
  > Turnstile was **off** between 2026-08-10 and 2026-08-11. During that
  > time, the frontend bundle did not send the public site key. The widget
  > did not mount, and the frontend generated no token. **Every**
  > missing-person report failed with a 403 response. The team chose to
  > accept spam risk over blocking a family member's report. The team
  > restored Turnstile after it confirmed the site key was in the bundle.
  >
  > **Consequence for new code:** every public form that writes data MUST
  > send `turnstileToken`. The canonical pattern is `useTurnstile()` plus a
  > `getToken()` call on each submit. See
  > `components/features/contacts/ContactForm.tsx` for an example. A
  > `POST` request with no token gets a 403 response. This is exactly how
  > the missing-person reports broke before.
  >
  > If the team ever needs to repeat this cycle, follow **this order**:
  >
  > 1. Confirm that `NEXT_PUBLIC_TURNSTILE_SITE_KEY` reaches the deployed
  >    bundle.
  > 2. Only then, restore `TURNSTILE_SECRET_KEY` on the Worker.
  >
  > The reverse order breaks the reports again.
- **RBAC in the admin panel.** The admin panel (`admin/`, a separate
  Next.js microservice) and the backend's authenticated surface
  (`backend/src/public-api/*`) use a JWT in an httpOnly cookie. They also
  use a deny-by-default capability engine
  (`backend/src/auth/capabilities.ts`). Each invited user can do only what
  their role explicitly allows. The system does not allow everything except
  what is forbidden. Integration API keys carry their own **scopes**. The
  effective permission is the intersection of the key's scopes and the
  current capabilities of the user who issued the key. Not even the seed
  superadmin can bypass this limit.
- **IP addresses are never stored in raw form.** When the backend stores or
  compares an IP address, for rate limiting or for duplicate-report
  suppression, it first passes the address through `hashIp()`. `hashIp()`
  uses a salt, `IP_SALT`. This salt is mandatory in production. It must be
  at least 32 characters, or the server does not start. The backend never
  stores an unhashed IP address.
- **CORS uses an allowlist, never a wildcard.** `CORS_ORIGINS` explicitly
  defines which origins may call the backend. The configuration never uses
  `*`.
- **Security headers, end to end.** Caddy (`Caddyfile.example`) adds these
  headers to every site: HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
  `Cross-Origin-Opener-Policy`, and a restrictive `Permissions-Policy`. The
  backend uses `helmet`. The frontend sets its own CSP in
  `frontend/next.config.ts`.
- **Secrets never enter the repository.** `.gitignore` excludes `.env` and
  every `.env.*` file, except `.env.example`. `.env.example` documents
  every production secret with an obviously fake placeholder, such as
  `CHANGE_ME_...`. It never documents a real value. The
  `disaster-secrets-bootstrap` skill generates the real secrets with
  `openssl rand`. This skill refuses to finish if a placeholder still
  remains.
- **Continuous content audit.** `scripts/content-audit/` scans the full
  repository tree. The `disaster-content-audit` skill wraps this script.
  The scan looks for literals that this template was cleaned of: real IP
  addresses, personal email addresses, secrets with a recognizable shape,
  and identity markers from an earlier event. On any match, the script
  returns a non-zero exit code. The script is designed to run in CI on
  every pull request of your fork, not only once when you extract the
  template.

## Deployers: You Will Collect PII From People in Crisis

> **This applies today, not as a future condition.** terremotocolombia.co
> runs in production against a real Neon database, with real traffic.
> Mallanet.org is responsible for this data now, with the obligations this
> section describes. This is not a checklist for "when we launch".

This is not optional, and it is not a secondary detail. The purpose of this
software is to collect information about people affected by a disaster:
names, locations, health status, family contacts, and sometimes photos.
This is personal information in its most sensitive form. The system
collects this information from people who are not in a calm state to give
informed consent. Operating a deployment of this template makes you
responsible for this data. You carry the same legal and ethical obligations
as any organization that processes sensitive health and location data.
These obligations include GDPR, local data-protection laws, and a minimum
ethical standard. The minimum standard is this: do not expose the people
you are trying to help to greater harm.

The template enforces the controls above in the code itself. These
controls reduce the technical attack surface. They do not resolve the
following decisions. These decisions are yours to make:

- **Data minimization.** Request and store only the fields your operation
  truly needs to act. Every extra field adds risk. Examples of extra
  fields: an identity document number, a detailed medical note, or a
  high-resolution photo with intact EXIF/GPS metadata. Each of these
  fields becomes a risk surface if the system is compromised, or if a
  field leaks through human error. The template already omits some fields
  by default. For example, the patient-deduplication hash never stores the
  raw document number outside staging. Do not add capture of new sensitive
  fields without a concrete operational reason.
- **Retention.** Decide in advance how long you will keep reports, records
  of located people, and logs that carry personal data. Set this retention
  period for the time after the acute emergency phase ends. "Forever, just
  in case" is not a retention policy. It is a decision you did not make.
  Document your retention policy, and apply it through a process, not from
  memory.
- **Access.** The template's RBAC gives you the mechanism: roles and
  capabilities. The discipline of who receives which role is yours. Review
  periodically who has access to the admin panel. Revoke access for anyone
  who no longer needs it. Invitations and API keys revoke through
  soft-delete; you do not need to delete the account.
- **Decommission.** When the operation ends — for example, the disaster
  has passed, your organization stops operating the site, or you migrate
  to another platform — define what happens to the data. Consider these
  questions: Do you anonymize the data? Do you transfer the data to an
  entity with a legal mandate to keep it, such as civil protection or
  public health? Do you destroy the data in a verifiable way? This
  template does not yet include an automated decommission skill. Until it
  does, treat decommission as a manual runbook. Write this runbook
  **before** the urgency of shutting down the system forces you to
  improvise it.

If you are not sure of your concrete legal obligations — for example, which
law applies, how long you may retain a given field, or whether you must
notify a regulator after a data breach — consult someone with the mandate
to answer these questions in your jurisdiction. This template is not legal
advice.

## What NOT to Report Here

If you found real data about real people exposed in a specific deployment,
and not in this template's code, that is a privacy incident for the
deployer. It is not a vulnerability in the template. Contact the operator
of that site directly. If you do not know who to contact, and the risk is
immediate — for example, data about a person in crisis is publicly exposed
— prioritize removing the information from circulation. For example,
report the content to the platform where it was exposed. Do this before
you try to find the responsible party.
