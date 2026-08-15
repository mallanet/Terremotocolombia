import { Router } from "express";
import { z } from "zod";
import { asyncHandler, rateLimit, validate } from "@/middleware";
import { cached } from "@/lib/cache";
import { jsonWithEtag } from "@/lib/http";
import * as service from "@/services/official-deceased";

export const officialDeceasedRouter = Router();

const querySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(24),
	q: z.string().trim().max(120).optional(),
});

const CACHE_HEADERS = {
	"Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=120",
};

/**
 * @swagger
 * /api/deceased:
 *   get:
 *     summary: List confirmed deceased records from attributed official lists
 *     tags: [Deceased]
 *     responses:
 *       200: { description: Paginated official records and source attribution }
 */
officialDeceasedRouter.get(
	"/",
	rateLimit({ scope: "official-deceased:list", limit: 120 }),
	validate({ query: querySchema }),
	asyncHandler(async (req, res) => {
		const { page, pageSize, q } = req.query as unknown as z.infer<
			typeof querySchema
		>;
		const key = `official-deceased:${page}:${pageSize}:${q ?? ""}`;
		const result = await cached(key, 30_000, () =>
			service.listOfficialDeceased({ page, pageSize, search: q }),
		);
		jsonWithEtag(req, res, result, CACHE_HEADERS);
	}),
);
