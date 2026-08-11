# Runbook — Fase 0 (habilitación técnica)

Prerrequisitos antes de dirigir tráfico institucional al despliegue. Ver
`docs/propuesta-erp-gobierno.md` → Fase 0.

| # | Ítem | Estado | Bloqueado por |
| --- | --- | --- | --- |
| 1 | Protección anti-bot (Turnstile) | apagada en ambos lados | Doppler (humano) |
| 2 | Worker de colas desplegado | **port a Cloudflare en curso** (ver abajo) | cutover a prod = gate humano (G4) |
| 3 | Panel de autoridad desplegado | **desplegado** (admin.terremotocolombia.co, tras Cloudflare Access) | — (ver `docs/runbook-admin.md`) |
| 4 | Canal de supresión (Ley 1581) | **operativo en staging**; producción espera el seed (1 comando humano) | seed de capacidades en prod |
| 5 | Revisión de seguridad independiente | no iniciada | pendiente |

---

## 1. Turnstile

**No hay nada que programar.** El camino de código está completo: siete
formularios usan `useTurnstile` (`frontend/hooks/useTurnstile.tsx`) y diez
routers del backend usan `requireHuman`. Lo único que falta es configuración,
y el **orden importa**: invertirlo es lo que tumbó los reportes de personas
desaparecidas la vez anterior.

`scripts/verify-turnstile.sh [staging|production]` comprueba cada paso sin
escribir nada (sonda con cuerpo vacío: la rechaza el middleware o el validador,
nunca llega a insertar).

### Estado verificado (10 ago 2026)

```
production  →  site key en bundle: NO   ·  backend exige token: NO   →  coherente (apagado)
```

### Secuencia (staging primero, luego producción)

1. **[HUMANO]** Poner `NEXT_PUBLIC_TURNSTILE_SITE_KEY` en Doppler, config `stg`.
   La site key pública sale del dashboard de Cloudflare Turnstile.
2. Redesplegar el frontend de staging (push que toque `frontend/**`).
3. `scripts/verify-turnstile.sh staging` → **el Paso 1 debe pasar.**
   Si no aparece la site key, **detente**. El build no la recogió.
4. **[HUMANO]** Reponer `TURNSTILE_SECRET_KEY` en el Worker de la API de staging.
5. `scripts/verify-turnstile.sh staging` → debe decir `COHERENTE ... activo`.
6. Prueba manual en staging: enviar un reporte de persona desaparecida real
   desde el navegador y confirmar que **no** devuelve 403.
7. Repetir 1-6 con `prd` / producción.

> El paso 6 no es opcional. Los pasos 3 y 5 prueban configuración; solo el 6
> prueba que una persona puede efectivamente reportar.

---

## 2. Worker de colas — no es una tarea de código

`backend/worker/index.ts` es un **proceso Node de larga vida** con BullMQ que
requiere Valkey/Redis. En `docker-compose.prod.yml` es un servicio propio
(`command: ["npx", "tsx", "worker/index.ts"]`) con `depends_on: valkey`.

**Producción hoy corre solo en Cloudflare Workers.** No hay host de contenedores
ni instancia de Valkey. Un Worker de Cloudflare no puede alojar este proceso:
no hay proceso persistente, y BullMQ necesita conexión sostenida a Redis.

Es decir: *desplegar el worker* no es escribir código, es **levantar
infraestructura que hoy no existe**, con costo recurrente.

### Qué queda inerte sin él

- sincronización de sismos (`earthquakes.queue`)
- publicación de necesidades (`needsPublication.queue`) — módulo M3 de la propuesta
- importación de pacientes, manual **y** OCR (ambas pasan por `enqueuePatientImport`)
- federación de hub (`hub/`)
- mantenimiento programado (`maintenance.queue`)

### Decisión tomada: camino B (Cloudflare Queues + Cron Triggers)

El mantenedor eligió portar los jobs a Cloudflare (KTD1 del plan
`docs/plans/2026-08-10-002-refactor-queue-worker-cloudflare-port-plan.md`) en
vez de levantar contenedores + Valkey con costo recurrente. Estado por unidad:

| Unidad | Qué | Estado |
| --- | --- | --- |
| U1 seam de despacho (`lib/job-dispatch.ts`) | binding de Queues gana; BullMQ con `VALKEY_URL`; sin ambos, error claro | **en producción** |
| U4 geocode por Cron Trigger | `2-59/5 * * * *` | **en producción** |
| — sismos por Cron Trigger | `*/5 * * * *` (pre-plan) | **en producción** |
| U2 publicación de necesidades por Queue | colas `terremotocolombia-needs[-staging]`, consumidor `queue` en `worker.ts` | **en producción** (G4: fallo forzado → DLQ → audit_log, verificado en ambos entornos) |
| U3 visibilidad de cartas muertas | DLQ → `audit_log` (`queue.dead_letter`), visible en Auditoría del panel | **en producción** |
| — importación de pacientes por Queue | fuera del plan original, pedida por el mantenedor: colas `terremotocolombia-imports[-staging]`; transacciones interactivas reescritas como máquina de estados idempotente/reanudable (apply con claim + id determinista); roles.ts también reescrito (create/edit de roles estaba roto en Workers) | **hecha** — suite completa verde (375 tests) + E2E en staging |
| U5 sync de fuentes por Cron | + semántica de `/api/sync/status` sin BullMQ | pendiente (sin fuentes externas habilitadas hoy: `ENABLE_*` en false — no hay nada que sincronizar hasta que se habilite una) |
| U6 retirar Valkey del bundle de Workers | + documentar rate-limit permanente | parcial: rate-limit documentado; `lib/queues.ts` (BullMQ) sigue en el bundle, INERTE sin `VALKEY_URL` — sacarlo del todo toca los routers de sync (U5) |
| U7 `scripts/verify-jobs.sh` | verificación por frescura derivada | **hecho** |

**Cutover a producción (G4) = gate humano**: deploy manual del backend con
confirmación. Igual que siempre.

**Fuera de alcance a propósito**: importación de pacientes (manual y OCR) —
usa transacciones interactivas que fallan en Workers; le toca su propio plan.
El camino compose (`docker-compose.prod.yml`) queda intacto (R5).
