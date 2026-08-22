#!/usr/bin/env bash
# Domain smoke: health is required but not sufficient.
# Usage: scripts/smoke/domain-smoke.sh <staging|production> [expected-sha]
set -euo pipefail
ENVIRONMENT="${1:?usage: $0 staging|production [expected-sha]}"
EXPECTED_SHA="${2:-${EXPECTED_SHA:-}}"

case "$ENVIRONMENT" in
  staging)
    WEB="https://staging.terremotocolombia.co"
    API="https://api-staging.terremotocolombia.co"
    ADMIN="https://admin-staging.terremotocolombia.co"
    ;;
  production)
    WEB="https://terremotocolombia.co"
    API="https://api.terremotocolombia.co"
    ADMIN="https://admin.terremotocolombia.co"
    ;;
  *)
    echo "usage: $0 staging|production [expected-sha]" >&2
    exit 2
    ;;
esac

http_code() {
  curl -sS -o /dev/null -w "%{http_code}" --max-time 30 "$@" || echo 000
}

header_value() {
  local url="$1"
  local header="$2"
  curl -sS -D - -o /dev/null --max-time 30 "$url" \
    | awk -v h="$(echo "$header" | tr '[:upper:]' '[:lower:]')" '
        BEGIN { IGNORECASE=1 }
        tolower($1) == h ":" { sub("\r$", "", $0); sub(/^[^:]+:[ \t]*/, "", $0); print $0; exit }
      '
}

json_field() {
  local url="$1"
  local field="$2"
  curl -sS --max-time 30 "$url" | python3 -c '
import json,sys
field=sys.argv[1]
try:
    body=json.load(sys.stdin)
except Exception:
    sys.exit(0)
val=body.get(field, "")
if val is True: print("true")
elif val is False: print("false")
else: print(val)
' "$field"
}

READY_CODE="$(http_code "${API}/api/readyz")"
READY_OK=0
if [ "$READY_CODE" = "200" ]; then READY_OK=1; fi

REPORTS_CODE="$(http_code "${API}/api/reports?page=1&pageSize=1")"
EQ_CODE="$(http_code "${API}/api/earthquakes?limit=1")"
WEB_CODE="$(http_code "${WEB}/")"
ADMIN_CODE="$(http_code "${ADMIN}/api/health")"
# Guarded mutation without Turnstile must not succeed and must not 5xx.
VOL_CODE="$(http_code -X POST "${API}/api/volunteers" \
  -H "Content-Type: application/json" \
  -d '{}')"

DOMAIN_OK=1
fail() { echo "FAIL  $1"; DOMAIN_OK=0; }
pass() { echo "PASS  $1"; }

[ "$REPORTS_CODE" = "200" ] && pass "GET /api/reports HTTP $REPORTS_CODE" || fail "GET /api/reports HTTP $REPORTS_CODE"
[ "$EQ_CODE" = "200" ] && pass "GET /api/earthquakes HTTP $EQ_CODE" || fail "GET /api/earthquakes HTTP $EQ_CODE"
[ "$WEB_CODE" = "200" ] && pass "GET / HTTP $WEB_CODE" || fail "GET / HTTP $WEB_CODE"
[ "$ADMIN_CODE" = "200" ] && pass "GET admin /api/health HTTP $ADMIN_CODE" || fail "GET admin /api/health HTTP $ADMIN_CODE"
case "$VOL_CODE" in
  400|403) pass "POST /api/volunteers without Turnstile HTTP $VOL_CODE" ;;
  *) fail "POST /api/volunteers without Turnstile HTTP $VOL_CODE (want 400 or 403)" ;;
esac

if [ "$READY_OK" = "1" ]; then
  pass "GET /api/readyz HTTP $READY_CODE"
else
  echo "FAIL  GET /api/readyz HTTP $READY_CODE"
fi

SHA_OK=1
SHA_TARGETS="${SHA_TARGETS:-all}"
if [ -n "$EXPECTED_SHA" ]; then
  EXP="$(echo "$EXPECTED_SHA" | tr '[:upper:]' '[:lower:]')"
  check_sha_target() {
    case ",$SHA_TARGETS," in
      *,all,*|*,$1,*) return 0 ;;
      *) return 1 ;;
    esac
  }
  if check_sha_target web; then
    WEB_SHA="$(header_value "${WEB}/" "x-app-build-sha" | tr '[:upper:]' '[:lower:]')"
    [ "$WEB_SHA" = "$EXP" ] && pass "frontend x-app-build-sha=$WEB_SHA" || { fail "frontend x-app-build-sha=${WEB_SHA:-missing} expected $EXP"; SHA_OK=0; }
  fi
  if check_sha_target api; then
    API_SHA="$(json_field "${API}/api/healthz" "sha" | tr '[:upper:]' '[:lower:]')"
    [ "$API_SHA" = "$EXP" ] && pass "api healthz sha=$API_SHA" || { fail "api healthz sha=${API_SHA:-missing} expected $EXP"; SHA_OK=0; }
  fi
  if check_sha_target admin; then
    ADMIN_SHA="$(json_field "${ADMIN}/api/health" "sha" | tr '[:upper:]' '[:lower:]')"
    [ "$ADMIN_SHA" = "$EXP" ] && pass "admin health sha=$ADMIN_SHA" || { fail "admin health sha=${ADMIN_SHA:-missing} expected $EXP"; SHA_OK=0; }
  fi
fi

if [ "$READY_OK" = "1" ] && [ "$DOMAIN_OK" != "1" ]; then
  echo "domain-smoke: /api/readyz is healthy but a domain check failed"
  exit 1
fi
if [ "$READY_OK" != "1" ]; then
  echo "domain-smoke: /api/readyz is not healthy"
  exit 1
fi
if [ "$SHA_OK" != "1" ]; then
  echo "domain-smoke: served build SHA does not match the approved SHA"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [ -x "$ROOT/scripts/verify-jobs.sh" ]; then
  echo "Running Queue/Cron freshness (verify-jobs.sh ${ENVIRONMENT})"
  "$ROOT/scripts/verify-jobs.sh" "$ENVIRONMENT"
fi

echo "domain-smoke: OK"
