# Social kit — Terremoto Colombia

Assets listos para meta tags, WhatsApp/Telegram preview y favicon del producto **terremotocolombia.co** (**Mallanet.org**).

## Open Graph

| Asset | Estado | Notas |
|-------|--------|-------|
| `opengraph-terremoto-colombia.html` | Master remaster | 1200×630, sin cifras, `.co`, blue Mallanet |
| `assets/og-1200x630.jpg` | Pendiente export | Requiere renderer desktop OD |
| `assets/og-1734x907.jpg` | Pendiente export | Paridad familia VE |

### Meta recomendada

```html
<meta property="og:type" content="website" />
<meta property="og:locale" content="es_CO" />
<meta property="og:url" content="https://terremotocolombia.co" />
<meta property="og:title" content="Terremoto Colombia · Mallanet.org" />
<meta property="og:description" content="Plataforma ciudadana para reportes, mapa de afectación y acceso a fuentes oficiales de emergencia en Colombia." />
<meta property="og:image" content="https://terremotocolombia.co/og-1200x630.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Terremoto Colombia · Mallanet.org — mapa y reportes ciudadanos verificados" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Terremoto Colombia · Mallanet.org" />
<meta name="twitter:description" content="Reportes, mapa y fuentes oficiales de emergencia en Colombia." />
<meta name="twitter:image" content="https://terremotocolombia.co/og-1200x630.jpg" />
```

## Favicon (isotipo Mallanet oficial)

Fuente: `brand/mallanet/isotipo-claro.*` sobre tile ink `#0f2154`.

| Archivo | Uso |
|---------|-----|
| `favicon.svg` | Preferido (moderno) |
| `favicon.ico` | Legacy / fallback |
| `apple-touch-icon.png` | iOS 180×180 |
| `brand/favicon/favicon-32.png` | Tabs clásicos |
| `brand/favicon/favicon-192.png` / `512` | PWA / Android |
| `assets/favicon/*` | Mirror del set |

### Head snippet

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
```

## site.webmanifest (mínimo)

```json
{
  "name": "Terremoto Colombia",
  "short_name": "Terremoto CO",
  "description": "Infraestructura ciudadana de emergencia — Mallanet.org",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f2154",
  "theme_color": "#0f2154",
  "icons": [
    { "src": "/assets/favicon/android-chrome-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/favicon/android-chrome-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## Reglas

1. Favicon de producto = **isotipo Mallanet oficial** (no Epicentro, no trazo aproximado).
2. Glifo Epicentro = identidad de producto en UI/OG, no favicon.
3. OG estático **sin** magnitud ni cifras de víctimas.
4. Crédito visible: **solo Mallanet.org** + disclaimer no partidista.
5. Brand action = `#4080f2`; `#003893` solo franja CO.
