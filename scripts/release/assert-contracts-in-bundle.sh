#!/usr/bin/env bash
# Prove the backend Worker bundle includes the local contracts package.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$(mktemp -d)"
cleanup() { rm -rf "$OUT"; }
trap cleanup EXIT

cd "$ROOT/backend"
npx wrangler deploy --dry-run --outdir "$OUT"
if ! grep -R -F -- '@mallanet/contracts' "$OUT" >/dev/null; then
  echo "FAIL  wrangler dry-run bundle does not contain @mallanet/contracts"
  exit 1
fi
echo "PASS  wrangler dry-run bundle contains @mallanet/contracts"
