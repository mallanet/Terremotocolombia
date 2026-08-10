#!/usr/bin/env bash
# scripts/content-audit/run.sh
#
# Content audit for this public template. Greps the working tree for known
# real-deployment literals (banned-patterns.txt) and checks a few structural
# rules (no tracked binary assets outside a small SVG allowlist, no stray
# .env files, sane/fresh git history).
#
# Exit 0  -> no known-pattern findings. This is NOT a clean bill of health,
#            it only means nothing on the known-literals list was found.
#            Human review of the tree is still required before publishing.
# Exit 1  -> at least one finding. A readable report is printed to stdout.
# Exit 2  -> the script itself is misconfigured (e.g. missing patterns file).
#
# Written to run on bash 3.2+ (macOS default) and GNU bash on CI (Ubuntu).
# Avoids mapfile/readarray and associative arrays for that reason.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PATTERNS_FILE="$SCRIPT_DIR/banned-patterns.txt"
# Private, gitignored overlay: deployment-specific real literals live here
# instead of in the public PATTERNS_FILE above. Optional — loaded only if it
# exists, so a fresh clone of the public template (which never ships this
# file) still runs the generic checks with no configuration needed.
LOCAL_PATTERNS_FILE="$SCRIPT_DIR/banned-patterns.local.txt"

cd "$REPO_ROOT" || exit 2

if [ ! -f "$PATTERNS_FILE" ]; then
  echo "content-audit: missing $PATTERNS_FILE" >&2
  exit 2
fi

# --- temp files (declared up front so the EXIT trap never sees an unbound
#     variable under `set -u`, regardless of where the script bails out) ----
REPORT_TMP=""
HARD_PAT_TMP=""
HARD_CS_PAT_TMP=""
CONTEXT_PAT_TMP=""
FILELIST_TMP=""
CONTENT_FILELIST_TMP=""
CONTEXT_FILELIST_TMP=""

cleanup() {
  rm -f "$REPORT_TMP" "$HARD_PAT_TMP" "$HARD_CS_PAT_TMP" "$CONTEXT_PAT_TMP" \
        "$FILELIST_TMP" "$CONTENT_FILELIST_TMP" "$CONTEXT_FILELIST_TMP"
}
trap cleanup EXIT

REPORT_TMP="$(mktemp)"
HARD_PAT_TMP="$(mktemp)"
HARD_CS_PAT_TMP="$(mktemp)"
CONTEXT_PAT_TMP="$(mktemp)"
FILELIST_TMP="$(mktemp)"
CONTENT_FILELIST_TMP="$(mktemp)"
CONTEXT_FILELIST_TMP="$(mktemp)"

FINDINGS=0

report() {
  printf '%s\n' "$1" >> "$REPORT_TMP"
  FINDINGS=$((FINDINGS + 1))
}

# ===========================================================================
# 0. Enumerate the working tree once, excluding noise directories.
#    (.git, node_modules, .next — matches the exclusion the spec asks for;
#    applied consistently to every check below, not just the grep pass, so
#    the audit doesn't drown in third-party node_modules assets.)
# ===========================================================================
# .open-next/ y .wrangler/ son salida de build del despliegue en Cloudflare
# Workers (gitignorados). En CI no existen —el checkout es limpio— pero en
# local llenaban el informe de copias de assets que ya se revisan en su origen.
find . \
  \( -path './.git' -o -path '*/node_modules' -o -path '*/.next' \
     -o -path '*/.open-next' -o -path '*/.wrangler' \) -prune -o \
  -type f -print > "$FILELIST_TMP"

# Content-scan file list: same, minus the pattern file(s) themselves. They
# have to contain the banned literals verbatim in order to ban them, so they
# would always self-match otherwise.
SELF="./scripts/content-audit/banned-patterns.txt"
SELF_LOCAL="./scripts/content-audit/banned-patterns.local.txt"
grep -v -F -x -e "$SELF" -e "$SELF_LOCAL" "$FILELIST_TMP" \
  | grep -v -E '\.svg$|/generated/|^\./\.claude/skills/geo/' > "$CONTENT_FILELIST_TMP" || true

# .claude/skills/geo/ es codigo VENDORIZADO de terceros
# (https://github.com/zubair-trabzada/geo-seo-claude), no contenido nuestro.
# Sus scripts mandan un User-Agent de Chrome cuya version de cuatro numeros
# separados por puntos el patron de IPv4 publica lee, con toda la razon del
# mundo, como una direccion IP.
# Auditar el arbol de un tercero por fugas de NUESTRO despliegue no aporta; si
# se actualiza el vendor, se revisa el diff del vendor.

# Por que se excluyen los .svg y lo generado del escaneo POR CONTENIDO:
#
# El patron de IP privada busca secuencias decimales tipo 192.168.x.x. Los
# datos de un <path> SVG son exactamente eso — "M652.17,195.34c-4.95,0-9.11…" —
# asi que cada logo daba [hard-banned] por pura coincidencia numerica. Igual
# pasa con frontend/lib/generated/brand-logo.ts, que es el mismo SVG embebido
# como data-URI.
#
# No se pierde cobertura real: los SVG siguen pasando por el check de
# [banned-svg-payload] (nada de <image> ni base64, que es como se colaria una
# foto dentro de un vector) y por la revision de EXIF/GPS del checklist humano.
# Lo que se pierde es un falso positivo que, repetido en cada ejecucion, es lo
# que hace que la gente deje de leer el informe.

# Context-banned allowlist: the origin-story docs, exact paths only (does
# NOT exempt nested READMEs like admin/README.md or frontend/AGENTS.md).
# Superficies de DOCUMENTACION donde los patrones CONTEXT: si pueden aparecer.
#
# Antes eran solo tres ficheros, porque en una plantilla generica cualquier
# mencion a un despliegue concreto era ruido. En un despliegue real la linea
# util es otra: la historia y las decisiones SE CUENTAN en los docs (de donde
# viene este repo, en que se diferencia del anterior), y lo que no puede pasar
# es que un identificador del despliegue anterior acabe en codigo o config.
#
# Por eso el allowlist es "documentacion", y el veto sigue firme en
# frontend/, backend/, admin/, infra/ y config/ — que es donde un valor
# copiado de Venezuela romperia o filtraria algo de verdad.
is_allowlisted() {
  case "$1" in
    ./README.md|./README.es.md|./CLAUDE.md|./AGENTS.md|./CONTRIBUTING.md|./SECURITY.md) return 0 ;;
    ./docs/*) return 0 ;;
    # El propio audit y sus patrones se explican a si mismos.
    ./scripts/content-audit/*) return 0 ;;
    *) return 1 ;;
  esac
}
: > "$CONTEXT_FILELIST_TMP"
while IFS= read -r f; do
  if ! is_allowlisted "$f"; then
    printf '%s\n' "$f" >> "$CONTEXT_FILELIST_TMP"
  fi
done < "$CONTENT_FILELIST_TMP"

# ===========================================================================
# 1. banned-patterns.txt: hard-banned (everywhere) vs context-banned
#    (everywhere except the allowlist above).
# ===========================================================================
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    ''|'#'*) continue ;;
    CONTEXT:*) printf '%s\n' "${line#CONTEXT:}" >> "$CONTEXT_PAT_TMP" ;;
    CASESENSITIVE:*) printf '%s\n' "${line#CASESENSITIVE:}" >> "$HARD_CS_PAT_TMP" ;;
    *) printf '%s\n' "$line" >> "$HARD_PAT_TMP" ;;
  esac
done < "$PATTERNS_FILE"

if [ -f "$LOCAL_PATTERNS_FILE" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|'#'*) continue ;;
      CONTEXT:*) printf '%s\n' "${line#CONTEXT:}" >> "$CONTEXT_PAT_TMP" ;;
      CASESENSITIVE:*) printf '%s\n' "${line#CASESENSITIVE:}" >> "$HARD_CS_PAT_TMP" ;;
      *) printf '%s\n' "$line" >> "$HARD_PAT_TMP" ;;
    esac
  done < "$LOCAL_PATTERNS_FILE"
fi

# Build bash arrays from the file lists (portable on bash 3.2, no mapfile).
content_files=()
while IFS= read -r f; do
  content_files+=("$f")
done < "$CONTENT_FILELIST_TMP"

context_files=()
while IFS= read -r f; do
  context_files+=("$f")
done < "$CONTEXT_FILELIST_TMP"

if [ -s "$HARD_PAT_TMP" ] && [ "${#content_files[@]}" -gt 0 ]; then
  hard_hits="$(grep -H -n -i -I -E -f "$HARD_PAT_TMP" -- "${content_files[@]}" 2>/dev/null || true)"
  if [ -n "$hard_hits" ]; then
    while IFS= read -r hit; do
      [ -n "$hit" ] && report "[hard-banned]    $hit"
    done <<HARDHITS
$hard_hits
HARDHITS
  fi
fi

if [ -s "$HARD_CS_PAT_TMP" ] && [ "${#content_files[@]}" -gt 0 ]; then
  hard_cs_hits="$(grep -H -n -I -E -f "$HARD_CS_PAT_TMP" -- "${content_files[@]}" 2>/dev/null || true)"
  if [ -n "$hard_cs_hits" ]; then
    while IFS= read -r hit; do
      [ -n "$hit" ] && report "[hard-banned]    $hit"
    done <<HARDCSHITS
$hard_cs_hits
HARDCSHITS
  fi
fi

if [ -s "$CONTEXT_PAT_TMP" ] && [ "${#context_files[@]}" -gt 0 ]; then
  context_hits="$(grep -H -n -i -I -E -f "$CONTEXT_PAT_TMP" -- "${context_files[@]}" 2>/dev/null || true)"
  if [ -n "$context_hits" ]; then
    while IFS= read -r hit; do
      [ -n "$hit" ] && report "[context-banned] $hit  (identificador del despliegue anterior: permitido en documentacion, no en codigo ni config)"
    done <<CONTEXTHITS
$context_hits
CONTEXTHITS
  fi
fi

# ===========================================================================
# 2a. Binary/vector assets: allowed only inside declared asset directories.
#
# WHY THIS IS AN ALLOWLIST AND NOT A BLANKET BAN
#
# The original rule banned binary assets everywhere, because this repo was a
# GENERIC PUBLIC TEMPLATE that must not carry any organisation's identity: a
# stray logo was, by definition, someone else's branding leaking into a
# template other people would fork.
#
# This repo is now a real deployment (terremotocolombia.co, Mallanet.org) and
# it legitimately ships its own brand: logos, favicons, OG images. Under the
# old rule the audit could only ever fail, and an audit that always fails is
# an audit nobody reads — which costs far more than the assets it flags.
#
# So the rule is narrowed rather than dropped. Assets are allowed ONLY under
# the directories below; anywhere else is still a finding, because an image
# appearing outside them is the shape of the thing we actually fear: a photo
# of an affected person committed by accident.
#
# The checks that matter for privacy — banned literals, .env files, EXIF/GPS
# review, git history — are untouched.
ASSET_ALLOW_PREFIXES="./brand/ ./docs/design/brand/ ./frontend/public/ ./frontend/app/"

is_asset_allowed() {
  # $1 = path as printed by find (starts with ./)
  for prefix in $ASSET_ALLOW_PREFIXES; do
    case "$1" in
      "$prefix"*) return 0 ;;
    esac
  done
  return 1
}
# ===========================================================================
BANNED_EXTS="jpg jpeg png gif webp ico woff woff2 ttf otf mp4 pdf"
while IFS= read -r f; do
  is_asset_allowed "$f" && continue
  lower_f="$(printf '%s' "$f" | tr '[:upper:]' '[:lower:]')"
  for ext in $BANNED_EXTS; do
    case "$lower_f" in
      *".$ext")
        report "[banned-extension] $f  (.$ext assets belong under one of: $ASSET_ALLOW_PREFIXES)"
        ;;
    esac
  done
done < "$FILELIST_TMP"

# SVGs: same allowlist. Wherever they ARE allowed they must still be plain
# vector markup — no <image> tags, no embedded base64. That check is the one
# with teeth: it is what stops a raster photo being smuggled inside an .svg,
# so it now runs across every allowed directory, not just frontend/.
while IFS= read -r f; do
  lower_f="$(printf '%s' "$f" | tr '[:upper:]' '[:lower:]')"
  case "$lower_f" in
    *.svg) : ;;
    *) continue ;;
  esac
  if is_asset_allowed "$f"; then
    if grep -q -i -E '<image|base64' -- "$f" 2>/dev/null; then
      report "[banned-svg-payload] $f  (svg must not contain an <image> tag or a base64 payload)"
    fi
  else
    report "[banned-svg-location] $f  (svg files belong under one of: $ASSET_ALLOW_PREFIXES)"
  fi
done < "$FILELIST_TMP"

# ===========================================================================
# 2b. No .env files other than .env.example may actually ship. Local
#     .env.local / .env.test.local fixtures are fine as long as .gitignore
#     keeps them out of the published tree (this template's convention) — so
#     a file only counts as a finding if it's tracked, or untracked-but-not-
#     ignored (i.e. `git add .` would pick it up).
# ===========================================================================
IN_GIT_REPO=0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 && IN_GIT_REPO=1

while IFS= read -r f; do
  base="${f##*/}"
  case "$base" in
    .env.example) continue ;;
    .env*) : ;;
    *) continue ;;
  esac
  if [ "$IN_GIT_REPO" -eq 1 ]; then
    if git check-ignore -q -- "$f" 2>/dev/null; then
      continue # gitignored local fixture — cannot leak into the published tree
    fi
  fi
  report "[banned-env-file] $f  (only .env.example may be committed/published; real .env files must stay gitignored)"
done < "$FILELIST_TMP"

# ===========================================================================
# 2c. Git history sanity: a freshly-templated repo should have a small,
#     recent history. Warn (as a reportable finding) if that stops being
#     true — it usually means the original project's history leaked in.
# ===========================================================================
CUTOFF_DATE="2026-07-10"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  commit_count="$(git rev-list --all --count 2>/dev/null || echo 0)"

  if [ "${commit_count:-0}" -gt 50 ] 2>/dev/null; then
    report "[git-history] $commit_count commits found (sanity limit is 50 for a freshly-templated repo) — verify this is not the original project's history"
  fi

  if [ "${commit_count:-0}" -gt 0 ] 2>/dev/null; then
    # Explicit 00:00:00 matters: BSD/macOS `date -j -f` fills any field the
    # format string omits (H:M:S here) from the CURRENT time, not midnight,
    # so a bare "%Y-%m-%d" format would make the cutoff silently track "now".
    cutoff_epoch="$(date -u -d "$CUTOFF_DATE 00:00:00" +%s 2>/dev/null || date -u -j -f '%Y-%m-%d %H:%M:%S' "$CUTOFF_DATE 00:00:00" +%s 2>/dev/null || echo "")"
    if [ -n "$cutoff_epoch" ]; then
      while IFS=' ' read -r csha ctime; do
        [ -z "$csha" ] && continue
        if [ "$ctime" -lt "$cutoff_epoch" ] 2>/dev/null; then
          human_date="$(date -u -d "@$ctime" +%Y-%m-%d 2>/dev/null || date -u -r "$ctime" +%Y-%m-%d 2>/dev/null || echo "$ctime")"
          report "[git-history] commit $csha predates $CUTOFF_DATE (committed $human_date) — verify this is not the original project's history"
        fi
      done < <(git log --all --format='%H %ct' 2>/dev/null || true)
    else
      echo "[git-history] could not determine cutoff epoch for $CUTOFF_DATE on this system; skipped the pre-$CUTOFF_DATE commit check" >&2
    fi
  fi
else
  # Not a git checkout at all (e.g. an extracted zip) — nothing to sanity
  # check, and that by itself isn't a content-security finding.
  echo "[git-history] not inside a git working tree; skipped the history sanity check" >&2
fi

# ===========================================================================
# Report
# ===========================================================================
if [ "$FINDINGS" -gt 0 ]; then
  echo "content-audit: FAIL — $FINDINGS finding(s)"
  echo "===================================================================="
  cat "$REPORT_TMP"
  echo "===================================================================="
  exit 1
fi

echo "no known-pattern findings — cannot confirm clean; human review of the tree is still required before publishing"
exit 0
