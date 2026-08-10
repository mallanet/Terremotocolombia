# Plan de remaster — Identidad Mallanet × Terremoto Colombia

## Intent summary

Remaster **Full ejecutado**: OD + `brand/` + frontend Next. Canon Mallanet (`#4080f2` / `#0f2154` / `#e1eaff`), tipografía Sora + IBM Plex, dominio `.co`, OG sin cifras, crédito **solo Mallanet.org**.

**Alcance locked:** `full_including_frontend`  
**Crédito locked:** solo Mallanet.org (GlobalEmergency fuera)

---

## 0. Estado actual de la línea visual (POST-REMASTER)

| Capa | Estado vivo | Ver en |
|------|-------------|--------|
| **Paleta** | Blue `#4080f2` · ink `#0f2154` · mist `#e1eaff` | `DESIGN.md`, `brand-spec.md` |
| **Tipografía** | Sora + IBM Plex Sans + IBM Plex Mono | OG HTML, `layout.tsx` |
| **Red Mallanet** | Isotipos / logos oficiales | `brand/mallanet/` |
| **Producto** | Epicentro retintado blue | `brand/producto/`, `mark.svg` |
| **Favicon** | Isotipo claro sobre ink | `favicon-preview.html` |
| **Open Graph** | Canvas ink + logo claro + Epicentro · sin cifras · `.co` | `opengraph-terremoto-colombia.html` |
| **Frontend** | Tokens + fonts + OG runtime + favicons + franja CO | `frontend/app/globals.css` |

### Tokens vivos (canon)

```
--accent / --brand-blue   #4080f2
--brand-navy / ink        #0f2154
--mallanet-mist           #e1eaff
--co-blue (franja only)   #003893
--crisis                  #CE1126
```

---

## 1. Árbol aplicado

### OD Design Files

```
brand/mallanet/     isotipo + logo claro/oscuro (+ README)
brand/producto/     epicentro-mark + lockup-horizontal
brand/favicon/      16–512 + ico + apple + master
brand/_legacy/      mallanet-mark aproximado (deprecado)
brand/references/   VE contraste
DESIGN.md · brand-spec.md · social-kit.md · plan.md
opengraph-terremoto-colombia.html · favicon-preview.html
favicon.svg|.ico · apple-touch-icon.png · site.webmanifest
```

### Repo `terremotocolombia/`

```
brand/mallanet/                 ← assets oficiales (ya no sueltos en raíz)
docs/design/                    ← sync kit OD
docs/DESIGN.md                  ← YAML Mallanet + Sora/IBM Plex
frontend/app/globals.css        ← tokens
frontend/app/layout.tsx         ← Sora + IBM Plex
frontend/lib/social-preview.tsx ← OG runtime ink + logo
frontend/public/brand/          ← logos runtime
frontend/public/favicon*|icon-* ← set Mallanet
frontend/public/manifest.webmanifest
frontend/styles/shell-layout.css ← franja Y/B/R real
```

---

## 2. Decisiones locked (siguen vigentes)

| Decisión | Valor |
|----------|-------|
| Dominio | `terremotocolombia.co` |
| OG cifras | Estático **sin** magnitud / víctimas / fechas |
| Postura | Infraestructura cívica; cero campaña |
| Tipo | Sora + IBM Plex (distinct vs VE) |
| Concepto producto | *Epicentro cívico* ≠ favicon |
| Favicon | Isotipo oficial sobre `#0f2154` |
| Crédito | **Solo Mallanet.org** |
| Brand action | `#4080f2` — `#003893` solo franja CO |

---

## 5. Checklist — cerrado

### P0 OD
- [x] `brand/mallanet/` kebab-case oficiales
- [x] `DESIGN.md` + `brand-spec.md` tokens §3
- [x] Legacy aproximado → `brand/_legacy/`
- [x] Epicentro retintado + lockup
- [x] Favicon set desde isotipo claro
- [x] OG HTML remaster (logo + blue + sin cifras + `.co`)
- [x] `social-kit.md` / `site.webmanifest` / `favicon-preview.html`
- [x] Grep emerald / `#0B2A3A` fuera del kit vivo

### P1 repo + frontend
- [x] Mover sueltos → `brand/mallanet/`
- [x] Sync `docs/design/`
- [x] `docs/DESIGN.md` YAML remaster
- [x] `globals.css` + fonts layout
- [x] `social-preview` + OG/Twitter routes
- [x] Favicons `public/` + manifest theme ink
- [x] Hex brand residual → Mallanet (franja CO preservada)
- [x] `frontend/public/brand/`

### P2
- [ ] Export raster OG 1200×630 / 1734×907 (renderer desktop)

---

## Acceptance (post-remaster)

1. Cero assets Mallanet aproximados en raíz OD / raíz repo.
2. Accent / theme / anillos / `--brand-blue` = familia `#4080f2`.
3. Favicon OD + frontend = isotipo oficial sobre `#0f2154`.
4. OG HTML + runtime sin cifras; dominio `.co`.
5. Docs + globals citan hex oficiales.
6. Lista negra política intacta.
7. `#003893` solo franja / context-accent.

---

## Next (opcional)

- Export JPG del OG cuando el renderer desktop esté disponible.
- Revisar `favicon-preview.html` + `opengraph-terremoto-colombia.html` en Design Files.
