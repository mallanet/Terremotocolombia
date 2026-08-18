# Manifest — Ola 0 X visuals

**Producto:** https://terremotocolombia.co · **Red:** Mallanet.org  
**Fuente:** composición tipográfica Mallanet (`frames-export.html`) → PNG vía Chromium/Playwright  
**No usar** Soul/Popcorn de Higgsfield para estas cards: en esta cuenta solo hay familia Soul y genera basura ilegible.

| Archivo | Post / uso | Origen |
|---------|------------|--------|
| `x-ancla-utilidad-16x9.png` | **A2** ancla (slot 1) | frame `#x-ancla-utilidad-16x9` |
| `x-telefonos-16x9.png` | **B1** teléfonos (slot 2) | frame `#x-telefonos-16x9` |
| `x-antirumor-16x9.png` | **D1** antirumor (slot 3) | frame `#x-antirumor-16x9` |
| `x-hilo-portada-16x9.png` | **Hilo H** portada 1/8 (slot 4) | frame `#x-hilo-portada-16x9` |
| `x-header-16x9.png` | Header perfil X (~1500×500 @2x) | frame `#x-header-16x9` |

**G-REPLY:** solo texto — sin visual.

Regenerar:

```bash
# desde un dir con playwright instalado:
node docs/campaigns/generated/x/export-frames.mjs
# o el one-liner en scripts/higgsfield/README si aplica
```

Los PNG de salida están en `.gitignore`; `frames-export.html`, `export-frames.mjs` y este manifesto sí se versionan.
