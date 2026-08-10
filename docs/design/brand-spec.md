# Brand spec — Terremoto Colombia × Mallanet

**One-liner:** Infraestructura cívica de emergencia para Colombia — blue Mallanet `#4080f2`, ink `#0f2154`, tipografía propia (Sora + IBM Plex); hermano de red Mallanet, no clon de Venezuela.

## Tokens (OKLch + hex canónicos)

```css
:root {
  --bg:      oklch(97% 0.008 260);
  --surface: oklch(100% 0 0);
  --fg:      oklch(26.8% 0.096 266);   /* ≈ #0f2154 */
  --muted:   oklch(48% 0.03 260);
  --border:  oklch(90% 0.02 267);
  --accent:  oklch(61.8% 0.184 261);  /* #4080f2 */

  --font-display: "Sora", system-ui, sans-serif;
  --font-body:    "IBM Plex Sans", system-ui, sans-serif;
  --font-mono:    "IBM Plex Mono", ui-monospace, monospace;
}
```

### Extended (red / severidad / bandera)

```css
:root {
  --mallanet-blue: #4080f2;
  --mallanet-ink:  #0f2154;
  --mallanet-mist: #e1eaff;
  --brand-navy:    var(--mallanet-ink);
  --crisis:        #CE1126;
  --co-yellow:     #FCD116;
  --co-blue:       #003893; /* solo franja bandera */
  --co-red:        #CE1126;
}
```

## Observed rules

1. **Mallanet blue (`--accent` / `#4080f2`) is the brand signal** — logo point, epicentro rings, links, selected map chrome. Max two accent hits per viewport.
2. **Crisis red (`--crisis`) is severity only** — primary emergency CTA, alert badges, critical pins. Max one solid crisis CTA per viewport.
3. **Flag bar is territorial chrome** — thin Y/B/R strip; `#003893` never doubles as brand action blue.
4. **No campaign semiotics** — no tigers, military emblems, partisan slogans; credit **only Mallanet.org**.
5. **Static OG never ships event numbers** — no magnitude, casualties, or political dates in master art.

## Canon paths / credit

- Product: `terremotocolombia.co`
- Network: **Mallanet.org** only
- Red mark: `brand/mallanet/isotipo-*.svg`
- Product mark: `brand/producto/epicentro-mark.svg`
- Favicon: isotipo claro sobre tile ink `#0f2154` — never Epicentro
