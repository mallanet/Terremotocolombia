/**
 * /api/campaign — lecturas públicas de la campaña de reconstrucción.
 *
 * rateLimit generoso + cached() + jsonWithEtag, igual que /api/pets: son datos
 * que la landing pollea y que no dependen de quién pregunta, así que pueden
 * vivir en caché de borde. La escritura (el compromiso de donación) vive en
 * routes/campaign-pledges.ts, montada aquí como sub-router.
 */
import { Router } from "express";
import { asyncHandler, rateLimit } from "@/middleware";
import { cached } from "@/lib/cache";
import { jsonWithEtag } from "@/lib/http";
import { notFound } from "@/lib/errors";
import { CAMPAIGN_MATERIALS } from "@/lib/campaign-materials";
import { DEFAULT_CAMPAIGN } from "@/db/campaign-schema";
import { sites, pledges, stats } from "@/services/campaign";
import { campaignPledgesRouter } from "./campaign-pledges";

export const campaignRouter = Router();

const SITES_CACHE = { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" };
const STATS_CACHE = { "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=60" };

/**
 * @swagger
 * /api/campaign/materiales:
 *   get:
 *     tags: [system]
 *     summary: Catálogo de materiales que acepta la campaña
 *     responses:
 *       200: { description: Catálogo de materiales }
 */
campaignRouter.get(
  "/materiales",
  rateLimit({ scope: "campaign-read", limit: 120 }),
  asyncHandler(async (req, res) => {
    jsonWithEtag(req, res, { materials: CAMPAIGN_MATERIALS }, SITES_CACHE);
  }),
);

/**
 * @swagger
 * /api/campaign/puntos:
 *   get:
 *     tags: [system]
 *     summary: Puntos de recolección abiertos, por ciudad
 *     responses:
 *       200: { description: Lista de puntos }
 */
campaignRouter.get(
  "/puntos",
  rateLimit({ scope: "campaign-read", limit: 120 }),
  asyncHandler(async (req, res) => {
    const list = await cached("campaign:sites", 30_000, () => sites.listSites(DEFAULT_CAMPAIGN));
    jsonWithEtag(req, res, { sites: list }, SITES_CACHE);
  }),
);

/**
 * @swagger
 * /api/campaign/balance:
 *   get:
 *     tags: [system]
 *     summary: Comprometido, recibido y enviado (agregados públicos)
 *     responses:
 *       200: { description: Agregados de la campaña }
 */
campaignRouter.get(
  "/balance",
  rateLimit({ scope: "campaign-read", limit: 120 }),
  asyncHandler(async (req, res) => {
    const balance = await cached("campaign:stats", 10_000, () =>
      stats.getCampaignStats(DEFAULT_CAMPAIGN),
    );
    jsonWithEtag(req, res, balance, STATS_CACHE);
  }),
);

/**
 * @swagger
 * /api/campaign/certificado/{code}:
 *   get:
 *     tags: [system]
 *     summary: Certificado de una donación, por su código
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Certificado }
 *       404: { description: Código no encontrado }
 */
campaignRouter.get(
  "/certificado/:code",
  rateLimit({ scope: "campaign-certificate", limit: 30 }),
  asyncHandler(async (req, res) => {
    const certificate = await pledges.getCertificate(String(req.params.code ?? ""));
    if (!certificate) throw notFound("No encontramos ese código.");
    res.json({ certificate });
  }),
);

campaignRouter.use("/compromisos", campaignPledgesRouter);
