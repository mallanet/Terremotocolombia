# Panel admin

Panel de administración del mapa de emergencias. App Next.js standalone
(microservicio aparte del sitio público). El navegador llama same-origin al BFF
del propio panel (`app/api/*`), que reenvía al backend por la red interna.

## Requisitos

- Node >=24

## Arrancar

```bash
npm install
npm run dev        # desarrollo
npm run lint
npm run typecheck
npm run test
npm run build
```

## Estructura

```
admin/
├── app/      # Next App Router: páginas + BFF (app/api/*)
├── src/      # contexts (DDD), shared (auth/http), ui (atoms), config
└── tests/    # vitest
```

## Despliegue y acceso

El panel corre como Worker de Cloudflare en ambos entornos
(`admin.terremotocolombia.co` y `admin-staging.terremotocolombia.co`), con el
mismo patrón OpenNext del frontend (`wrangler.jsonc` + `open-next.config.ts`).
Producción está detrás de Cloudflare Access (OTP por email + allowlist).

- Operación diaria (altas de usuarios, roles, carga de datos, problemas
  conocidos): **`docs/runbook-admin.md`**.
- Reglas de despliegue (staging automático, producción manual con
  confirmación): **`CLAUDE.md`**.
- Desarrollo local contra una API remota:

```bash
COOKIE_SECURE=false EMERGENCY_API_URL=https://api-staging.terremotocolombia.co npm run dev
```

(`COOKIE_SECURE=false` es imprescindible: sin ello la cookie de sesión no se
fija sobre http://localhost.)
