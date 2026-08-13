# shadcn/ui en Terremoto Colombia

Capa de componentes sobre el design system de `docs/DESIGN.md`.
No reemplaza las clases `.e-*` ni los tokens `--qi-*` / `--e*`.

## Setup

- App: `frontend/`
- Config: `frontend/components.json` (estilo `radix-nova`, Tailwind v4)
- Utilidad: `frontend/lib/utils.ts` (`cn`)
- Primitivos: `frontend/components/ui/{button,input,textarea,label,dialog,sheet,tabs,badge,card,select,alert,sonner,skeleton,dropdown-menu,scroll-area,separator}.tsx`
- Skills de agente: `.agents/skills/{shadcn,frontend-design,web-design-guidelines,...}` y reglas saas-ui en `.cursor/rules/`

## Tokens

En `frontend/app/globals.css` (bloque shadcn dentro de `:root`):

| Token shadcn | Mallanet / rol |
|---|---|
| `--primary` | `#4080f2` action-blue (acciones interactivas) |
| `--destructive` | `#ce1126` crisis-red (urgencia / CTA crítico) |
| `--sidebar-primary` | `#0f2154` brand-navy (chrome) |
| `--background` / `--card` | blanco superficie |
| `--muted` | `#eef2f7` canvas |
| `--muted-foreground` | `#52606d` text-muted |
| `--border` / `--input` | `#dce3ec` |
| `--ring` | action-blue |
| `--radius` | `0.75rem` (12px, `rounded.md`) |
| `--font-sans` | IBM Plex Sans (`--font-body`) |
| `--font-heading` | Sora (`--font-display`) |

Dark mode del shell (`[data-dark="true"]`) también puentea estos tokens a `--ebg` / `--esurf` / etc.

## Cómo añadir un componente

Desde `frontend/`:

```bash
npx shadcn@latest add <nombre>
```

No pises los primitivos custom ya existentes en `components/ui/`
(`ChipFilter`, `SearchInput`, `TabNav`, …).

## Qué no hacer (aún)

- No migrar `ReportForm`, hero, mapa ni el shell `.e-*` en el mismo PR
  que el init. Primero primitives + tokens; después pantalla a pantalla.
- No meter Geist ni `next/font/google`: las fuentes van auto-alojadas en
  `app/fonts/` (ver comentario en `app/layout.tsx`).
- Evitar packs de animación tipo Magic UI / Aceternity en flujos de
  emergencia.
