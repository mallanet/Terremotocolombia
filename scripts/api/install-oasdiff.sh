#!/usr/bin/env bash
# Install the SHA-pinned oasdiff binary. Do not use an unpinned "latest" tag.
set -euo pipefail

VERSION="${OASDIFF_VERSION:-1.29.1}"
DEST="${1:-"${RUNNER_TEMP:-/tmp}/oasdiff-bin"}"
mkdir -p "$DEST"

uname_s="$(uname -s)"
uname_m="$(uname -m)"
if [[ "$uname_s" == "Linux" && "$uname_m" == "x86_64" ]]; then
  asset="oasdiff_${VERSION}_linux_amd64.tar.gz"
  sha256="541f7c66c933495fceef24eaf5c48aa66c19069f366f7bd0a60a6a4820c5e533"
elif [[ "$uname_s" == "Darwin" ]]; then
  asset="oasdiff_${VERSION}_darwin_all.tar.gz"
  sha256="759cc5703d9335c441ad84a7074c705486b2c493f79bcfdf251c7a9c788b1171"
else
  echo "unsupported platform: ${uname_s} ${uname_m}" >&2
  exit 1
fi

url="https://github.com/oasdiff/oasdiff/releases/download/v${VERSION}/${asset}"
archive="${DEST}/${asset}"
curl -sSL -o "$archive" "$url"
if command -v sha256sum >/dev/null 2>&1; then
  echo "${sha256}  ${archive}" | sha256sum -c
else
  echo "${sha256}  ${archive}" | shasum -a 256 -c
fi
tar -xzf "$archive" -C "$DEST"
chmod +x "${DEST}/oasdiff"
"${DEST}/oasdiff" --version
