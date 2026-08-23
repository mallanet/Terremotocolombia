/**
 * GET /api/public/volunteer-analytics — capability-gated aggregates (no PII).
 *
 * Pattern: hospital-supplies hand router — rateLimit + requireCapability + cached.
 */
import { Router } from "express";
import { z } from "zod";
import { asyncHandler, rateLimit, validate } from "@/middleware";
import { requireCapability } from "@/middleware/auth";
import { badRequest } from "@/lib/errors";
import { cached, invalidate } from "@/lib/cache";
import {
  loadVolunteerAnalytics,
  volunteerAnalyticsCacheKey,
} from "@/services/volunteer-analytics/load";

export const volunteerAnalyticsRouter = Router();

/**
 * @swagger
 * /api/public/volunteer-analytics:
 *   get:
 *     summary: Volunteer aggregates with no PII (capability volunteer:read)
 *     tags: [Public:VolunteerAnalytics]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: since
 *         schema: { type: string }
 *         description: Optional ISO-8601 cohort start.
 *       - in: query
 *         name: refresh
 *         schema: { type: string }
 *         description: Set 1 or true to drop the process cache for this key.
 *     responses:
 *       200:
 *         description: KPIs, buckets, and callouts. No names or contact.
 *       401: { description: No autenticado }
 *       403: { description: Sin capacidad }
 */

const CACHE_TTL_MS = 120_000;

const querySchema = z.object({
  since: z.string().optional(),
  refresh: z.string().optional(),
});

volunteerAnalyticsRouter.get(
  "/",
  rateLimit({ scope: "public:volunteer-analytics:read", limit: 120 }),
  requireCapability("volunteer:read"),
  validate({ query: querySchema }),
  asyncHandler(async (req, res) => {
    const sinceRaw = typeof req.query.since === "string" ? req.query.since.trim() : "";
    const refreshRaw =
      typeof req.query.refresh === "string" ? req.query.refresh.trim() : "";

    let sinceIso: string | undefined;
    let sinceMs: number | undefined;
    if (sinceRaw) {
      sinceMs = Date.parse(sinceRaw);
      if (Number.isNaN(sinceMs)) {
        throw badRequest("Parámetro since inválido (ISO-8601).");
      }
      sinceIso = sinceRaw;
    }

    const cacheKey = volunteerAnalyticsCacheKey(sinceIso);
    if (refreshRaw === "1" || refreshRaw === "true") {
      invalidate(cacheKey);
    }

    const payload = await cached(cacheKey, CACHE_TTL_MS, () =>
      loadVolunteerAnalytics({ sinceMs, sinceIso, now: Date.now() }),
    );
    res.json(payload);
  }),
);
