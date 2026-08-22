# Mixed-version compatibility lanes

Parent rules: KTD15, U0 approach items 11–12, U2/U3/U5 client adoption.

This repository keeps two stored lanes for every contract or client change.
U0 installs the layout and the shape snapshots. Zod runtime validation
starts in U4/U2/U3/U5. OpenAPI `oasdiff` starts in U16.

## Lanes

| Lane | Client artifact | API artifact |
|---|---|---|
| stable-client / candidate-API | last approved frontend+admin Worker versions | candidate backend SHA |
| candidate-client / stable-API | candidate frontend+admin SHA | last approved backend Worker version |

Do not rebuild an old commit to recreate a lane. Use the stored Worker
version (Gradual Versions tag = source SHA) or the stored fixture files.

## Candidate host

Production upload uses `wrangler versions upload` and does not send
traffic. A version is reachable as a preview only if preview URLs are
enabled on the Worker (maintainer). Until that exists, mixed-version proof
for U0 is:

1. Unit tests that refuse SHA mismatch on promote.
2. Shape fixtures under `scripts/compat/fixtures/`.
3. Staging, where frontend/admin/API deploy together from the same SHA.

Do not point a citizen browser at an unapproved candidate.

## Fixture rules

- Synthetic payloads only. No real names, phones, documents, or photos.
- No edit tokens, JWTs, or Turnstile tokens in fixtures.
- Additive-only diffs during the compatibility window (R5).

## How to run (U0)

```bash
node scripts/compat/check-fixtures.mjs
```

After U2, replace key-presence checks with shared-contract `safeParse`.
