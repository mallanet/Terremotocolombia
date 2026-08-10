# Campaña de difusión — Terremoto Colombia (ago 2026)

Suite creativa **en este repo**. Generación de imágenes/video: **Higgsfield** (`platform.higgsfield.ai`). Open Design quedó fuera.

## URL canónica

**https://terremotocolombia.com**

## Higgsfield

| Doc | Uso |
|-----|-----|
| [higgsfield/README.md](higgsfield/README.md) | Conexión, créditos, CLI |
| [higgsfield/PROMPTS.md](higgsfield/PROMPTS.md) | Prompts por pieza del inventario |
| [higgsfield/out/](higgsfield/out/) | Descargas locales (gitignored si pesa) |

Credenciales: repo-root `.env` → `HF_API_KEY` + `HF_API_SECRET` (nunca commitear).

```bash
# desde la raíz del repo
python3 scripts/higgsfield/cli.py smoke
python3 scripts/higgsfield/cli.py generate \
  --name x-launch-1200x675 \
  --aspect-ratio 16:9 \
  --prompt-file campaigns/difusion-2026-08/higgsfield/prompts/x-launch.txt
```

Docs oficiales: https://docs.higgsfield.ai/docs

## Índice del kit

| Path | Qué es |
|------|--------|
| [BRIEF.md](BRIEF.md) | Brief maestro |
| [brand/](brand/) | Tokens + logos |
| [ethics/](ethics/) | Crisis comms |
| [research/](research/) | Tendencias 2026 |
| [specs/](specs/) | Tamaños |
| [copy/](copy/) | Captions por red |
| [calendar/](calendar/) | Pauta 7 días |
| [creatives/](creatives/) | Inventario + storyboards |

## Mensaje núcleo

Mapa ciudadano para coordinar ayuda — **terremotocolombia.com**. Mallanet.org. Emergencias **123**. Magnitud **SGC**. Coordinación **UNGRD**.
