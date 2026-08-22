#!/usr/bin/env bash
# Upload a Worker version with no production traffic.
# CWD must be the app directory (frontend, admin, or backend).
# Required env: APP_BUILD_SHA, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
set -euo pipefail
SHA="${APP_BUILD_SHA:?APP_BUILD_SHA is required}"
if ! [[ "$SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  echo "APP_BUILD_SHA must be a full 40-character git SHA" >&2
  exit 1
fi
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$(mktemp)"
trap 'rm -f "$OUT"' EXIT
npx wrangler versions upload \
  --tag "$SHA" \
  --message "source=$SHA" \
  --var "APP_BUILD_SHA:$SHA" 2>&1 | tee "$OUT"
VERSION_ID="$(node "$ROOT/scripts/release/parse-version-id.mjs" < "$OUT")"
echo "WORKER_VERSION_ID=$VERSION_ID"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "worker_version_id=$VERSION_ID" >> "$GITHUB_OUTPUT"
  echo "source_sha=$SHA" >> "$GITHUB_OUTPUT"
fi
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "## Worker version uploaded (no traffic)"
    echo "- source SHA: \`$SHA\`"
    echo "- Worker version ID: \`$VERSION_ID\`"
    echo "- Promotion is a separate workflow. This step does not change production traffic."
  } >> "$GITHUB_STEP_SUMMARY"
fi
