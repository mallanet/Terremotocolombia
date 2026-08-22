#!/usr/bin/env bash
# Promote an already-uploaded Worker version. Does not rebuild.
# CWD must be the app directory.
# Required env: SOURCE_SHA, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
# Optional env: WORKER_VERSION_ID
set -euo pipefail
SHA="${SOURCE_SHA:?SOURCE_SHA is required}"
if ! [[ "$SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  echo "SOURCE_SHA must be a full 40-character git SHA" >&2
  exit 1
fi
if [ -n "${WORKER_VERSION_ID:-}" ]; then
  echo "Promoting Worker version ${WORKER_VERSION_ID} (source ${SHA})"
  npx wrangler versions deploy "${WORKER_VERSION_ID}@100%" --yes
else
  echo "Promoting Worker version tagged ${SHA}"
  npx wrangler versions deploy --version-tag "$SHA" --percentage 100 --yes
fi
