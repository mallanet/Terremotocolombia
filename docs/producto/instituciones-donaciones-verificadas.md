# Instituciones verificadas — Donaciones (terremotocolombia.co)

**Review date:** 2026-08-10  
**Purpose:** Editorial source of truth for the `/donaciones` directory. Mallanet / Terremoto Colombia does **not** collect these donations; the site only links to official channels.

## Verification criteria

An organization is listed only if it meets **at least one**:

1. **SNGRD operational entity** with a donation channel on an official domain (e.g. Cruz Roja Colombiana).
2. **ESAL with NIT** and donation URLs/accounts published on its own `.org` / `.org.co` site (e.g. ABACO NIT `900326456-1`).
3. **State health blood network** (INS Dona Vida / INVIMA-supervised banks + Cruz Roja Banco de Sangre).

### Excluded

- Social-media-only fundraisers, unverified GoFundMe, third-party forwarded accounts.
- Remittances P2P to private individuals (Western Union / Nequi “to victims”).
- UNGRD as a citizen crowdfunding recipient (coordinates response; not a public donation wallet).
- Framing [ayuda.cruzrojacolombiana.org](https://ayuda.cruzrojacolombiana.org/) as a **Chocó / Colombia quake** destination — that landing is currently a **Venezuela** campaign. Use CRC national hubs instead and tell donors to confirm the active emergency on the official site.

### Category “Envío de dinero”

Means **monetary donation to verified institutional accounts**, not person-to-person remittance.

### Event caveat (Chocó M7.4, 2026-08-10)

As of this review date, **no CRC/ABACO campaign URL dedicated only to the Chocó earthquake** was confirmed in open sources. Listed links are **permanent national channels** (or ABACO’s published Colombia emergency money page). Re-check daily via [@cruzrojacol](https://x.com/cruzrojacol), CRC site, ABACO, and [@UNGRD](https://x.com/UNGRD).

---

## Fundaciones

| Organization | NIT | Role | Official URL | Verification basis | Caveat |
|--------------|-----|------|--------------|--------------------|--------|
| Cruz Roja Colombiana (SNCRC) | 899999025-3 | Humanitarian response, SNGRD partner; money and in-kind coordination via official CRC channels | https://www.cruzrojacolombiana.org/ | SNGRD / Movement; official domain | Confirm active Colombia emergency on site; do not use Venezuela-only landing for Chocó |
| ABACO — Asociación de Bancos de Alimentos de Colombia | 900326456-1 | National network of food banks (26 banks); logistics and cash for food security in emergencies | https://abaco.org.co/ | ESAL + NIT + published accounts on abaco.org.co | No Chocó-quake-only campaign confirmed; national hub |
| Banco de Alimentos de Bogotá | — (ABACO network member) | Receives food/cash; distributes to vulnerable households via vetted orgs | https://www.bancodealimentos.org.co/donaciones-hoy/ | Member of ABACO; donation pages on bancodealimentos.org.co | Local Bogotá bank; confirm if shipment targets Pacífico/Chocó |

**Operator notes (accounts change — prefer site over hardcoding in UI):**

- CRC (historical published accounts for other campaigns): Davivienda corriente examples have appeared on CRC press pages (e.g. `0560455069996904` for rains; other numbers for Venezuela). **Always copy from the live CRC page**, not from this note.
- ABACO emergency money page: Bre-B `0038892667`; Bancolombia savings `04895966431`; name Asociación de Bancos de Alimentos de Colombia ABACO; support `fundraising@abaco.org.co` — source: https://abaco.org.co/emergenciainvernalcolombia

---

## Envío de dinero (institutional)

| Organization | Official URL | Verification basis | Caveat |
|--------------|--------------|--------------------|--------|
| Cruz Roja Colombiana — Dona dinero | https://www.cruzrojacolombiana.org/dona-dinero/ | Official CRC donor hub | Confirm destination/emergency on form; Accionistas Humanitarios: https://www.cruzrojacolombiana.org/accionistas-humanitarios/ |
| ABACO — donación monetaria (emergencia Colombia) | https://abaco.org.co/emergenciainvernalcolombia | NIT + Bre-B/Bancolombia on ABACO domain | Page title is winter/flood emergency; still a verified Colombia money channel — not Chocó-quake-specific |

---

## Salud (sangre)

| Organization | Official URL | Verification basis | Caveat |
|--------------|--------------|--------------------|--------|
| Banco de Sangre — Cruz Roja Colombiana | https://www.cruzrojacolombiana.org/banco-de-sangre/ | CRC national blood network (Armenia, Bogotá, Cali, Cartagena, Manizales, Medellín, Barranquilla, Ibagué, Villavicencio) | Check hours/requirements at the local bank |
| Dónde donar sangre — Instituto Nacional de Salud (Dona Vida) | https://donavida.ins.gov.co/Paginas/donacion-sangre.html | State Red Nacional de Bancos de Sangre (INS); INVIMA sanitary oversight | Locator / guidance; not a cash donation page |

---

## UI mapping (`OfertasList.tsx`)

| Category | Card name | Action | URL |
|----------|-----------|--------|-----|
| Fundaciones | Cruz Roja Colombiana | Donar | https://www.cruzrojacolombiana.org/ |
| Fundaciones | ABACO — Bancos de Alimentos | Donar | https://abaco.org.co/ |
| Fundaciones | Banco de Alimentos de Bogotá | Donar | https://www.bancodealimentos.org.co/donaciones-hoy/ |
| Envío de dinero | Cruz Roja — donación monetaria | Enviar dinero | https://www.cruzrojacolombiana.org/dona-dinero/ |
| Envío de dinero | ABACO — donación monetaria | Enviar dinero | https://abaco.org.co/emergenciainvernalcolombia |
| Salud | Banco de Sangre Cruz Roja | Ver detalles | https://www.cruzrojacolombiana.org/banco-de-sangre/ |
| Salud | Dónde donar sangre (INS) | Ver detalles | https://donavida.ins.gov.co/Paginas/donacion-sangre.html |

UI cards use **deep links only** (no bank numbers in the frontend).

---

## Revalidation checklist

1. Open each URL; reject if it earmarks a foreign emergency as “Colombia Chocó”.
2. Prefer CRC `/dona-dinero/` and Accionistas Humanitarios over `ayuda.cruzrojacolombiana.org` unless CRC publishes a Colombia-quake landing.
3. Watch [@cruzrojacol](https://x.com/cruzrojacol) and [@UNGRD](https://x.com/UNGRD) for new official campaign URLs; then update this doc and `OfertasList.tsx` together.
