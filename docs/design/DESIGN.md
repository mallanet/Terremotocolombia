# DESIGN.md — Terremoto Colombia

Sistema de diseño para la plataforma ciudadana de emergencia **Terremoto Colombia** (**Mallanet.org**).  
Dominio canónico: **terremotocolombia.co**.  
Parentesco con Terremoto Venezuela: **estructural** (urgencia cívica, franja nacional, voz operativa) — **no** tipografía ni azul VE (`#2B51F0`).

## 1. Propósito y postura

| Dimensión | Definición |
|-----------|------------|
| Qué es | Mapa + reportes ciudadanos + acceso a fuentes oficiales (SGC, UNGRD, líneas 123/144/…) |
| Qué no es | Medio partidista, portal de gobierno, landing de campaña, clon visual de VE |
| Voz | Clara, verificable, accionable. “Información útil para quien necesita ayuda o quiere ayudar.” |
| Momento | Post-posesión 2026 + sismos: la UI debe leerse como **infraestructura cívica**, nunca como facción |
| Crédito | **Solo Mallanet.org** — sin GlobalEmergency ni otras redes |

## 2. Tokens

```css
:root {
  --bg:      oklch(97% 0.008 260);
  --surface: oklch(100% 0 0);
  --fg:      oklch(26.8% 0.096 266);
  --muted:   oklch(48% 0.03 260);
  --border:  oklch(90% 0.02 267);
  --accent:  oklch(61.8% 0.184 261); /* #4080f2 */

  --mallanet-blue: #4080f2;
  --mallanet-ink:  #0f2154;
  --mallanet-mist: #e1eaff;
  --brand-navy:    var(--mallanet-ink);
  --brand-blue:    var(--mallanet-blue);
  --crisis:        #CE1126;
  --success:       oklch(52% 0.12 150);
  --warn:          oklch(72% 0.14 85);
  --info:          oklch(55% 0.08 230);

  --co-yellow: #FCD116;
  --co-blue:   #003893; /* solo franja */
  --co-red:    #CE1126;

  --font-display: "Sora", system-ui, sans-serif;
  --font-body:    "IBM Plex Sans", system-ui, sans-serif;
  --font-mono:    "IBM Plex Mono", ui-monospace, monospace;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
}
```

### Roles de color

| Token | Uso |
|-------|-----|
| `--accent` / `--mallanet-blue` | Marca: anillos Epicentro, links, selección, punto del isotipo |
| `--mallanet-ink` | Wordmarks, tiles favicon, texto de máxima autoridad |
| `--mallanet-mist` | Fondos suaves, pills sobre ink, cuerpo del isotipo claro |
| `--crisis` | Severidad + **un** CTA primario de emergencia por viewport |
| `--co-*` | Solo franja de bandera (8–12 px) en shell público / OG |
| `--bg` / `--surface` | Canvas frío vs paneles blancos |

## 3. Tipografía

- **Display (Sora):** títulos de producto, OG headline, lockups. `letter-spacing: -0.02em` en ≥28 px.
- **Body (IBM Plex Sans):** UI, párrafos, formularios. Altura de línea 1.45–1.55.
- **Mono (IBM Plex Mono):** IDs de evento, coordenadas, hashes, timestamps tabulares.
- **Prohibido en display:** Inter, Roboto, Arial, Fraunces, Stara, Space Grotesk, Nunito (evitar paridad VE / plantilla).

### Escala (web)

| Rol | Tamaño | Peso |
|-----|--------|------|
| Display XL | 40–48 px | 700 |
| Display L | 28–32 px | 650–700 |
| Title | 20–22 px | 600 |
| Body | 16 px | 400–500 |
| Caption | 13–14 px | 500 |
| Mono data | 13–14 px | 500 |

OG (1200×630): título producto ≥48 px; cuerpo ≥22 px; URL ≥18 px.

## 4. Marca — capas

```
Red Mallanet (canon)  → brand/mallanet/* + #4080f2 / #0f2154 / #e1eaff
Producto Terremoto CO → brand/producto/epicentro-mark.svg + wordmark + franja Y/B/R
Urgencia operativa    → crisis #CE1126 — no decoración
```

Archivos:

- `brand/mallanet/isotipo-claro.svg` — favicon / PWA / chrome oscuro
- `brand/mallanet/logo-claro.svg` — wordmark en superficies oscuras / OG
- `brand/producto/epicentro-mark.svg` — glifo producto
- `brand/producto/lockup-horizontal.svg` — Epicentro + “Terremoto Colombia”
- `favicon.svg` · `favicon.ico` · `apple-touch-icon.png` · `brand/favicon/*`

Reglas:

1. Anillos Epicentro usan **`--accent`** (`#4080f2`), no crisis red.
2. Silueta de Colombia simplificada — no mapa topográfico.
3. Clearspace ≥ 0.25× altura del mark.
4. **Favicon / app icon = isotipo Mallanet oficial** sobre ink — nunca Epicentro.
5. Nunca combinar con escudos oficiales ni mascotas políticas.
6. Crédito visible: **Mallanet.org** únicamente.

## 5. Open Graph

| Parámetro | Valor |
|-----------|-------|
| Master | 1200×630 (`opengraph-terremoto-colombia.html`) |
| Familia | Export adicional 1734×907 desde el mismo master |
| Dominio en arte | `terremotocolombia.co` |
| Cifras | **Prohibidas** en el master estático |
| Franja | Y/B/R superior 10 px |
| Logo | `logo-claro` o isotipo sobre ink |
| CTA visual | Una barra ink con URL |

Meta:

- `og:title` — Terremoto Colombia · Mallanet.org  
- `og:description` — Plataforma ciudadana para reportes, mapa de afectación y acceso a fuentes oficiales de emergencia en Colombia.  
- `og:url` — https://terremotocolombia.co  
- `og:locale` — es_CO  

## 6. Componentes UI (producto)

### Shell

- Franja CO fija arriba (`--co-yellow` / `--co-blue` / `--co-red`).
- Nav: logo Mallanet o lockup producto; acciones secundarias ghost; **un** CTA crisis (“Reportar”) derecha.
- Fondo `--bg`; paneles `--surface` + `--border`.

### Botones

| Variante | Fondo | Texto | Uso |
|----------|-------|-------|-----|
| Primary crisis | `--crisis` | blanco | Reportar / pedir ayuda |
| Primary brand | `--accent` | blanco | Acciones de marca no críticas |
| Ghost | transparente + border | `--fg` | Secundarias |
| Text | — | `--accent` | Terciarias |

Hover: mover L de fondo ±0.08; **nunca** aclarar el texto a `--muted`.  
`:focus-visible`: anillo `#4080f2` a 45 % opacidad, 3 px offset 2 px.  
Touch target ≥ 44 px.

### Mapa — capas

| Capa | Color guía |
|------|------------|
| Rescate | `--crisis` |
| Acopio | `--warn` |
| Albergue | `--info` |
| Sin luz | `--muted` oscurecido |
| Desaparecidos | `--mallanet-ink` |
| Edificio dañado | `--accent` |

## 7. Contenido y datos

1. Magnitud / epicentro / profundidad: citar **SGC** primero; USGS como contraste.
2. Coordinación humanitaria: **UNGRD**.
3. No inventar canales Telegram/WhatsApp “nacionales”.
4. Placeholders honestos si falta dato (`—` / “Sin dato verificado”).
5. Líneas oficiales: 123, 144, 119, 132, 125, 112.

## 8. Lista negra

- Semiótica de campaña, militarismo, “tigre”, escudos de Estado como marca
- Gradientes púrpura, beige genérico AI, emoji como iconos funcionales
- Emerald Andean / navy plantilla `#00245E` / azul bandera `#003893` como brand action
- Rojo de crisis en fondos de sección enteros
- Dos botones sólidos para la misma acción en un viewport
- Cifras de evento en OG estático
- Tipografías o azul eléctrico de Terremoto Venezuela
- Crédito GlobalEmergency u otras redes

## 9. Motion (un solo florecimiento)

**Anillos de epicentro** — expand/fade suave (200 ms ease-out) en hero / mark animado.  
Nada más como “firma” de movimiento.

## 10. Archivos de este kit

| Archivo | Rol |
|---------|-----|
| `brand-spec.md` | Contrato corto OD |
| `DESIGN.md` | Este documento |
| `brand/mallanet/` | Isotipos y logos oficiales |
| `brand/producto/` | Epicentro + lockup |
| `brand/favicon/` | Set 16–512 + ico + apple |
| `favicon.svg` / `.ico` / `apple-touch-icon.png` | Aliases raíz |
| `site.webmanifest` | Manifest mínimo |
| `social-kit.md` | Meta OG + head snippets |
| `opengraph-terremoto-colombia.html` | Prototipo OG 1200×630 |
| `favicon-preview.html` | Preview de tamaños |
| `plan.md` | Plan + decisiones locked |
| `brand/references/` | Assets VE de contraste |
| `brand/_legacy/` | Trazo aproximado deprecado |
