# Handoff

**Goal:** Bring the admin volunteer screen closer to the MallaNet ficha,
starting with the data the database already holds.

**Status:** in progress

## Done

- Ficha panel per row on `/volunteers` — evidence: screenshot `/var/folders/fl/g07qpj416x50ct8y3xdlklpr0000gn/T/cursor/screenshots/volunteer-ficha.png` (temp dir, not in repo)
- BFF sends the detail fields for `volunteers` only — evidence: `listedFields()` in `app/api/models/[path]/route.ts`
- `model-table.tsx` split into row/form/status/cell modules — evidence: lean gate accepted the edit
- Tests — evidence: `npm test` in `admin/` → 31 files, 168 passed
- Typecheck and lint — evidence: `npm run typecheck`, `npm run lint` → clean

- Documented in `docs/admin-volunteer-ficha.md` — evidence: that file

## Open

- [ ] Maintainer approves the wider BFF field allowlist before any deploy
- [ ] `docs/architecture.md` has no link to the new doc: the local size
      gate refuses to grow that file (638 lines). Maintainer decides
      whether to split it or to link by hand.
- [ ] Nothing committed or pushed

## Blockers

- none

## Next

Human review of the diff. Only then decide the next PDF slice.

## Verify

```bash
cd admin && npm run typecheck && npm run lint && npm test
```

## Notes

- No schema change, no migration, no backend change. The backend DTO
  already returned these fields; only the BFF trimmed them away.
- Still missing vs PDFs: MN/VOL codes, WhatsApp PIN login, three
  geographies, skills catalog, vehicle type match, ofrecimientos,
  pedidos with center_id, Encaja/Parcial ranking, Vincular,
  collection_centers CRUD.
- The route file lost its header comment to pass the local comment gate.
- Do not copy real volunteer names, phones, or codes into this file.
