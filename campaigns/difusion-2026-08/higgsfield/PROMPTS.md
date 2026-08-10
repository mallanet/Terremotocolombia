# Higgsfield prompts — inventory mapping

Use with:

```bash
python3 scripts/higgsfield/cli.py generate --name <id> --aspect-ratio <r> --prompt-file campaigns/difusion-2026-08/higgsfield/prompts/<file>.txt
```

Shared negative constraints (already baked into each `.txt`):

- No photographs of injured people, no blood, no rubble with victims
- No readable fake casualty numbers
- No Venezuela branding, no `.app` domain text preferred as `terremotocolombia.com` only
- Clean flat / editorial civic design, navy `#00245E` and blue `#003893`, optional thin Colombia flag stripe
- Space for large typography overlays OR include short text as specified

| Asset id | File | Aspect |
|----------|------|--------|
| x-launch-1200x675 | prompts/x-launch.txt | 16:9 |
| x-thread-cover-1200x675 | prompts/x-thread-cover.txt | 16:9 |
| ig-launch-1080x1350 | prompts/ig-launch.txt | 4:5 |
| ig-carousel-* | prompts/ig-carousel-system.txt | 4:5 |
| sq-fuentes-1080x1080 | prompts/sq-fuentes.txt | 1:1 |
| story-cta-mapa-1080x1920 | prompts/story-cta-mapa.txt | 9:16 |
| story-fuentes-1080x1920 | prompts/story-fuentes.txt | 9:16 |
| reel-hook-mapa-1080x1920 | prompts/reel-hook-mapa.txt | 9:16 |
| reel-hook-voluntarios-1080x1920 | prompts/reel-hook-voluntarios.txt | 9:16 |
| x-header-1500x500 | prompts/x-header.txt | 16:9 |
| li-launch-1200x627 | prompts/li-launch.txt | 16:9 |

Avatars (`x-avatar`, `ig-avatar`): prefer export from existing `Isotipo_MallaNet*.png` / `frontend/public/icon-512.png` — no AI needed.
