#!/usr/bin/env bash
# Generate HEAD OpenAPI, require it to match the committed file, check coverage,
# validate, and on a PR compare against the exact base SHA spec (git show, no
# checkout of base code).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/backend"

export NODE_ENV="${NODE_ENV:-test}"
export DATABASE_URL="${DATABASE_URL:-postgres://mapa_app:localdev@localhost:5432/app}"
export JWT_SECRET="${JWT_SECRET:-test-jwt-secret-not-for-prod-0123456789}"
export PATIENT_DOCUMENT_HASH_SECRET="${PATIENT_DOCUMENT_HASH_SECRET:-test-patient-document-hash-secret-0123456789}"

WORKDIR="${RUNNER_TEMP:-/tmp}"
HEAD_SPEC="${WORKDIR}/head-openapi.json"
HEAD_SPEC_2="${WORKDIR}/head-openapi-2.json"
OASDIFF="${OASDIFF:-oasdiff}"

npx tsx src/lib/generate-openapi.ts check
npx tsx src/lib/generate-openapi.ts write "$HEAD_SPEC"
npx tsx src/lib/generate-openapi.ts write "$HEAD_SPEC_2"
if ! cmp -s "$HEAD_SPEC" "$HEAD_SPEC_2"; then
  echo "OpenAPI generation is not deterministic" >&2
  exit 1
fi

"$OASDIFF" validate -- "$HEAD_SPEC"

if [[ "${GITHUB_EVENT_NAME:-}" == "pull_request" ]]; then
  BASE_SHA="${OPENAPI_BASE_SHA:-}"
  if [[ -z "$BASE_SHA" ]]; then
    echo "OPENAPI_BASE_SHA is required on pull_request" >&2
    exit 1
  fi
  if git -C "$ROOT" cat-file -e "${BASE_SHA}:docs/api/openapi.json" 2>/dev/null; then
    BASE_SPEC="${WORKDIR}/base-openapi.json"
    git -C "$ROOT" show "${BASE_SHA}:docs/api/openapi.json" > "$BASE_SPEC"
    "$OASDIFF" validate -- "$BASE_SPEC"
    # `--` keeps a path that starts with `-` from being parsed as a flag.
    "$OASDIFF" breaking --fail-on WARN -- "$BASE_SPEC" "$HEAD_SPEC"
  else
    echo "No docs/api/openapi.json at ${BASE_SHA}; skip breaking compare (baseline introduction)."
  fi
else
  echo "Non-PR event: skip PR-base oasdiff (do not guess HEAD~1)."
fi
