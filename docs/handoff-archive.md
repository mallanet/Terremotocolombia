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

## Content audit: the buy.stripe.com veto was retired (2026-08-17, SETTLED)

Merging PR #50 turned CI red on main with one finding:
[hard-banned] ./config/deployment.config.json — buy.stripe.com. The pattern
exists so the public template never ships a payment link pointing at one
account. These links are Mallanet's own and live in the deployment identity
file as optional https-only keys, so the maintainer retired the pattern with
the precedent already set for discord.gg/ and chat.whatsapp.com
(PR #51, on main and cherry-picked here as b7608af).
DO NOT put it back. The rest of the list stays banned, and that is the point
of the rule: the two crowdfunding domains, the PayPal payment path and the
WhatsApp shortener. Read them in scripts/content-audit/banned-patterns.txt —
spelling them here makes the audit fail on its own notes.
The frontend deploy was never affected: it went green and shipped.

## Money donations through payment links (2026-08-17, SUPERSEDED)

Two Stripe payment links now exist, both declared in
config/deployment.config.json as OPTIONAL https-only keys (`donationUrl`,
`donationMonthlyUrl`). The validator was a closed key set, so it grew an
OPTIONAL_KEYS list: a fork with no payment processor still boots and its
buttons fall back to /donaciones.
- Nav button "Donar a Mallanet" -> one-off link. Merged to main in PR #50
  (commit 08b3041), production frontend deployed on its own.
- New landing /apoyanos, UNICEF-style: monthly support first, one-off
  second. Lives on THIS branch, ships with the campaign PR.
No invented impact equivalences ("your X buys Y"): we have no such figure,
and a false number on a page that asks for money is not a copy problem.
The amount is chosen on Stripe's page — payment links are closed products,
one link per frequency.

> Superseded 2026-08-17: /apoyanos owns the choice of amount and frequency,
> and the backend opens a Stripe Checkout session. The nav button points at
> /apoyanos, not at a payment link. The links survive under "otras formas de
> aportar" as a fallback. See the on-site donation form block in `HANDOFF.md`.

## PR #47 reported no checks (2026-08-17, SETTLED)

It targets main, it is open and not a draft, and CI triggers on
pull_request to main — yet `gh pr checks 47` says "no checks reported" after
two pushes. The Actions API also answered 504 around that time, so a GitHub
hiccup is the likeliest cause. Do NOT read the absence of a red mark as a
green build: verify locally (frontend 162 tests, content audit) or re-push
to force a run before merging this PR.

> Settled: CI runs on every push again. Both the `staging` branch and the PR
> report their checks.

## Merging main into this branch conflicted (2026-08-17, SETTLED)

Tried, aborted, nothing touched. main now carries PR #49 (staging) and the
volunteer ficha, so the conflicts are: infra/db/migrations/meta/_journal.json,
meta/0010_snapshot.json, and four admin model UI files
(route.ts, model-form.tsx, model-row.tsx, model-table.tsx — add/add, both
sides created them). The donate commit was cherry-picked here instead
(ef5da46) so /apoyanos could build. That cherry-pick is identical content
to main's, so it should merge as a no-op.

> Settled: the merge is done. See the merge block in `HANDOFF.md`.

## Harness note: some paths could not be declared at all (2026-08-17, FIXED)

TAG_RE in ~/.cursor/hooks/lib/stop_rules.sh is
  (edit|NEW):[A-Za-z0-9_./+=-]+
That character class has no parentheses and no brackets, so a tag stops at
the first one. `edit:.../frontend/app/(content)/apoyanos/page.tsx` is
captured as `.../frontend/app/`, which then fails the grep -qxF against the
recorded writes and reports TOPOLOGY VIOLATION every single time. Same for
`admin/app/api/models/[path]/route.ts`. Next.js route groups and dynamic
segments are everywhere here, so this fires on ordinary work and no amount
of care in the declaration avoids it. Fixing it means editing the hook:
add ()[] to the class and strip trailing punctuation.
The class DOES include the dot, so a tag that ends a sentence swallows the
full stop and stops matching. Never put a tag at the end of a sentence.

> Fixed 2026-08-17: the hook now carries `[]A-Za-z0-9_./+=()[-]` and strips
> trailing punctuation with `sed 's/[.,;:]*$//'`. Route groups and dynamic
> segments declare correctly. The rule about not ending a sentence with a
> tag is no longer needed, but it costs nothing to keep the habit.
