#!/usr/bin/env bash
# Fail closed: Dockerfiles must not hide install or typecheck failures.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FAIL=0

check_no_match() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if grep -nE -- "$pattern" "$file" >/dev/null; then
    echo "FAIL  $label"
    grep -nE -- "$pattern" "$file" || true
    FAIL=$((FAIL + 1))
  else
    echo "PASS  $label"
  fi
}

check_no_match "$ROOT/frontend/Dockerfile" 'npm ci.*\|\|.*npm install' "frontend Dockerfile has no npm ci fallback"
check_no_match "$ROOT/admin/Dockerfile" 'npm ci.*\|\|.*npm install' "admin Dockerfile has no npm ci fallback"
check_no_match "$ROOT/backend/Dockerfile" 'npm run build[[:space:]]*\|\|' "backend Dockerfile does not ignore tsc failure"

for file in "$ROOT/frontend/Dockerfile" "$ROOT/admin/Dockerfile"; do
  app="$(basename "$(dirname "$file")")"
  if grep -q 'ARG APP_BUILD_SHA' "$file"; then
    echo "PASS  ${app} Dockerfile declares APP_BUILD_SHA"
  else
    echo "FAIL  ${app} Dockerfile missing ARG APP_BUILD_SHA"
    FAIL=$((FAIL + 1))
  fi
done

exit "$FAIL"
