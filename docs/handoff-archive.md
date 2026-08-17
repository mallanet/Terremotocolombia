# Handoff archive

Blocks moved out of `HANDOFF.md` when that file hit its 300-line ceiling.
Nothing here is pending. It is kept because the reasoning explains why the
code looks the way it does.

## BLOCKER: staging and main held different schemas (2026-08-16, SETTLED)

staging was ahead of main by two migrations that never reached production:
`0010_furry_marauders` (official deceased lists) and
`0011_query_observability` (PR #45). The campaign migration was also 0010
(`0010_wide_lionheart`), because the branch started from main. Merging
conflicted in `_journal.json` and `meta/0010_snapshot.json`.

The number was never the real problem: any numbering bets on merge order.
Settled on 2026-08-17 by merging main into the campaign branch and
renumbering the campaign migrations to 0012 and 0013, which is safe because
both are idempotent and had never run outside a local database.

## Workers audit of the campaign code (2026-08-16): clean

The failure that broke `roles.ts` in production (an interactive
`db.transaction`, which compiles, passes locally under node-postgres, and
fails only in Workers) is not present. No `db.transaction(` call exists in
`backend/src/**`; only comments mention it.

`registerReceipt` claims the pledge with one atomic conditional UPDATE
(`WHERE id = ... AND status = 'pledged' ... RETURNING`) and compensates if
the receipt insert fails after it. That is the required idiom.

No campaign path is in `lib/json-edge-cache.ts`, so no authenticated
response can enter the edge cache.

## Banner of the campaign landing (2026-08-16)

`/reconstruccion` opens with `CampaignHero.tsx`: the frame of the home page
hero (`.e-hero*`), but its own image, set inline in the component and not in
`styles/shell-layout.css` — that file serves the whole house, and changing
its background would change the home page too.

The image is `public/campana/hero.jpg`: construction material, no people,
generated for this banner and compressed to 246 KB at 1920 px. The veil is
one flat layer, `bg-slate-950/62`. To show more or less of the photograph,
change that one number.

## Photo in the donation form and in the delivery (2026-08-16, built)

The maintainer chose: photo only (no video), and only the team sees it — no
public wall, thus no moderation screen to build.

An optional photo on the pledge form (`/reconstruccion`) and on the point
steward screen. Both reuse `persistPhotoDataUrl()` (R2 when configured, a
data URL in the column when not) and `usePhotoUpload()`, which redraws the
image on a canvas — that re-encode DROPS THE EXIF, so the GPS coordinates of
the phone never reach the server. No new code for that. The size ceiling is
`MAX_REPORT_PHOTO_CHARS`, the same one the reports use.

Verified against the local stack: a pledge with a photo stores it, and
`GET /api/campaign/certificado/<code>` does NOT return it. The steward inbox
does not return it either. Test rows were deleted after.

The panel reads the photo: `admin-pledges.ts` carries it in its columns and
DTO, the resource schema exposes it, and the Compromisos table has a "Foto"
column.

> Correction, 2026-08-17: this block used to say the thumbnail came from a
> `CellValue` component in `model-cell.tsx`. That file was ours, and the
> merge with main removed it. The thumbnail now lives in
> `ui/photo-cell.tsx`, with a regression test.

VIDEO STAYS OUT: it does not fit the base64-through-JSON path that every
form here uses. It needs a direct upload to R2 with a signed URL.
