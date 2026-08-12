/**
 * Sismos (USGS) — superficie pública read-only. Patrón canónico de GET polleado
 * (ver routes/hospitals.ts): rateLimit generoso + cached (micro-caché en proceso)
 * + jsonWithEtag (304) + Cache-Control.
 *
 * No hay mutaciones: el catálogo lo escribe el worker (earthquakes.queue.ts)
 * desde el USGS. Por eso esta superficie es solo lectura, anónima, sin Turnstile.
 *
 * Salida por DTO del service (allowlist) — nunca filas crudas.
 */
import { Router } from "express";
import { z } from "zod";
import { asyncHandler, rateLimit, validate } from "@/middleware";
import { jsonWithEtag } from "@/lib/http";
import { cached } from "@/lib/cache";
import * as service from "@/services/earthquakes";

export const earthquakesRouter = Router();

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

// Cache-Control: el feed USGS se refresca cada minuto; servimos con SWR corto.
const LIST_CACHE = {
  "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
};

/**
 * @swagger
 * /api/earthquakes:
 *   get:
 *     summary: Lista los sismos recientes en la región configurada (catálogo USGS)
 *     tags: [earthquakes]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 500 }
 *         description: Máximo de sismos a devolver (default 100, más recientes primero).
 *     responses:
 *       200:
 *         description: |
 *           Envelope `{ earthquakes, sync }`. `sync.fetchedAt` is epoch-ms of the
 *           last successful USGS sync signal (MAX(fetched_at)), or null if the
 *           catalog was never synced / is empty. Event list is newest-first.
 */
earthquakesRouter.get(
  "/",
  rateLimit({ scope: "earthquakes:list", limit: 120 }),
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { limit } = req.query as unknown as z.infer<typeof listQuery>;
    const effLimit = Number.isFinite(limit) ? (limit as number) : 100;
    const key = `earthquakes:${effLimit}`;

    // 30s: the worker upserts at most every ~5 min in prod; avoid DB per poll.
    const body = await cached(key, 30_000, () => service.listEarthquakes(effLimit));

    jsonWithEtag(req, res, body, LIST_CACHE);
  }),
);
