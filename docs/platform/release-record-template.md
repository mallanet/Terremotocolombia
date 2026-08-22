# Release record template

Create one immutable record for each staging, rehearsal, canary, production,
and rollback event. Copy this file. Do not put credentials, tokens, personal
data, or raw query strings in a record.

Fill `n/a-until-<unit>` when a later unit owns the field.

## Identity

- Record ID:
- Event type: staging | rehearsal | canary | production | rollback
- Operator:
- Approver:
- Start time (UTC):
- Finish time (UTC):
- Decision: proceed | hold | rollback
- Notes:

## Source

- Source repository:
- Source SHA (full 40):
- Colombia source SHA imported into the platform: n/a-until-U6
- Contracts version: n/a-until-U1
- OpenAPI digest: n/a-until-U16

## Schema

- Migration journal SHA256:
- Schema capability version: column-drift+journal (U0); indexes/ownership from U7/U8
- Active Neon branch ID (no connection string):
- Connection role name (no password):

## Artifacts

- Frontend Worker version ID:
- Admin Worker version ID:
- Backend Worker version ID:
- Frontend build ID (`APP_BUILD_SHA`):
- Admin build ID (`APP_BUILD_SHA`):
- Backend build ID (`APP_BUILD_SHA`):
- Docker image digests (VPS path): n/a until a registry is authorized

## Protocols

- Queue versions accepted/emitted: n/a-until-U20
- BullMQ versions accepted/emitted: n/a-until-U20
- IndexedDB / service-worker versions: n/a-until-U20

## Configuration

- Feature flags / module configuration:
- Service-configuration digest (see `docs/platform/service-configuration.manifest.json`):
- Previous stable Worker version IDs:
- Asset retention (seconds, staging wrangler deploy): 604800

## Checks

- Schema capability gate: pass | fail | omitted (name the actor)
- Domain smoke: pass | fail
- Served `x-app-build-sha` / health `sha` equals source SHA: yes | no
- Mixed-version lanes: n/a-until-U2 (shape fixtures only in U0)
- Baseline metrics:
- Observed metrics:

## Rollback

- Rollback target version IDs:
- Rollback rehearsal performed: yes | no
- Result:
