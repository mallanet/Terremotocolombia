#!/usr/bin/env bash
# Prove oasdiff fail-on WARN against checked-in fixtures.
# Removing a response field fails even if that file is treated as the new baseline.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OASDIFF="${OASDIFF:-oasdiff}"
FIXTURES="${ROOT}/scripts/api/fixtures"

fail() {
  echo "$1" >&2
  exit 1
}

code=0
"$OASDIFF" breaking --fail-on WARN -- "${FIXTURES}/base.json" "${FIXTURES}/remove-required-field.json" \
  && code=0 || code=$?
[[ "$code" -ne 0 ]] || fail "expected required-field removal to fail against the base SHA fixture"

code=0
"$OASDIFF" breaking --fail-on WARN -- "${FIXTURES}/base.json" "${FIXTURES}/remove-optional-field.json" \
  && code=0 || code=$?
[[ "$code" -ne 0 ]] || fail "expected WARN-level optional-field removal to fail"

"$OASDIFF" breaking --fail-on WARN -- "${FIXTURES}/base.json" "${FIXTURES}/add-optional-field.json" \
  || fail "expected additive optional field to pass"

code=0
"$OASDIFF" validate -- "${FIXTURES}/invalid.json" && code=0 || code=$?
[[ "$code" -ne 0 ]] || fail "expected invalid spec to fail validate"

"$OASDIFF" validate -- "${FIXTURES}/base.json" || fail "expected base fixture to validate"
echo "oasdiff fixtures ok"
