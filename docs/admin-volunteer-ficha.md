# Volunteer ficha (admin panel)

Each row on `/volunteers` opens a read-only detail panel. The panel shows
the fields the table does not list: offer, availability, offer types,
digital skills, field city, field role, rescue training, crisis
experience, own vehicle, source, internal notes, and the signup date.

## What it does not change

The ficha adds no endpoint, no table, and no migration.
`api/public/volunteers` already returned these fields. The panel's BFF
(`admin/app/api/models/[path]/route.ts`) removed them: it trimmed each row
to the table columns.

## How the fields travel

`listedFields()` in the BFF keeps the detail keys, but only for the
`volunteers` path. Every other model keeps the narrow allowlist.

The key list has one source: `fichaFieldKeys()` in
`admin/src/contexts/volunteers/ficha-fields.ts`. The ficha renders from
that list, and the BFF requests from the same list. A new field needs one
edit, in one file.

## Privacy

The panel now receives more volunteer data than before. This is data the
person gave about their own capacity. It is not data about affected
people. The screen stays behind `volunteer:read`, and, in production,
behind Cloudflare Access.

## Files

| File | Job |
| --- | --- |
| `src/contexts/volunteers/volunteer-ficha.tsx` | The panel |
| `src/contexts/volunteers/ficha-fields.ts` | Sections, labels, key list |
| `src/contexts/models/ui/model-row.tsx` | One table row and its expanded panels |
| `app/api/models/[path]/route.ts` | The field allowlist |

## Not included

The MallaNet documents describe more: MN and VOL codes, login with a PIN,
three geographies, a skills catalog, vehicle type match, ofrecimientos,
pedidos with `center_id`, the Encaja/Parcial ranking, Vincular, and
collection-center records. Each of those needs a schema change, and a
schema change in this repository is a human step.
