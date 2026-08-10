# Runbook — Fase 0 (habilitación técnica)

Prerrequisitos antes de dirigir tráfico institucional al despliegue. Ver
`docs/propuesta-erp-gobierno.md` → Fase 0.

| # | Ítem | Estado | Bloqueado por |
| --- | --- | --- | --- |
| 1 | Protección anti-bot (Turnstile) | apagada en ambos lados | Doppler (humano) |
| 2 | Worker de colas desplegado | sin desplegar | **infraestructura inexistente** |
| 3 | Panel de autoridad desplegado | construido, sin desplegar | pendiente |
| 4 | Canal de supresión (Ley 1581) | sin operar | pendiente |
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

### Dos caminos (decisión del mantenedor — implica gasto)

**A. Levantar el camino de contenedores.**
Host de contenedores (VPS / Fly / Railway) + Valkey gestionado. El código ya
existe y `docker-compose.prod.yml` lo describe. Es el único camino donde el
sistema completo funciona hoy, incluidas las transacciones interactivas que
fallan en Workers. Costo recurrente; suma un segundo entorno que operar.

**B. Portar los jobs a Cloudflare Queues + Cron Triggers.**
Sin infraestructura nueva y sin costo adicional relevante. Pero es una
reescritura real: BullMQ desaparece, cada job se reimplementa contra otro
modelo de entrega, y hay que resolver reintentos y dead-letter de nuevo.
No es trabajo de una tarde.

> **No elijas por defecto.** A cuesta dinero; B cuesta tiempo de ingeniería en
> mitad de una emergencia. Ninguna de las dos se decide sin el mantenedor.
