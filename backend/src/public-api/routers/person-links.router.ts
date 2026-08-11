/**
 * Router `api/public/person-links` — la superficie de revisión de Family
 * Search (U9): cola de vínculos propuestos, decisión (confirmar/rechazar/
 * inseguro), propuesta manual, unmerge, búsqueda de registros y ficha de
 * cluster.
 *
 * Router escrito a mano (verbos irregulares, no CRUD estándar) — mismo
 * criterio que deletion-requests.router.ts/partner-sync.router.ts: TODAS las
 * rutas llevan rateLimit + requireCapability; las mutaciones (decision,
 * propose, unmerge) además writeAudit (gates que exige el ESLint del repo).
 * Las lecturas (queue, records/search, clusters/:id) NO auditan — mismo
 * criterio que audit.router.ts.
 */
import { Router } from "express";
import { z } from "zod";
import { asyncHandler, rateLimit, validate } from "@/middleware";
import { requireCapability } from "@/middleware/auth";
import { userHasCapability } from "@/auth/resolve";
import { writeAudit } from "@/auth/audit";
import { notFound } from "@/lib/errors";
import * as service from "@/services/person-links";
import { getClusterFicha } from "@/services/person-clusters";

export const personLinksRouter = Router();

// --------------------------------------------------------------------- queue ---

const queueQuery = z.object({
  status: z.enum(["proposed", "confirmed", "rejected", "unsure"]).optional(),
  // Cursor keyset compuesto, codificado "<proposedAt>_<id>" (un solo query
  // param, mismo espíritu simple que el `before` numérico de audit.router.ts,
  // extendido a dos columnas — ver la nota de listQueue sobre por qué el
  // cursor no coincide 1:1 con el orden de negocio).
  before: z
    .string()
    .regex(/^\d+_.+$/, "Cursor inválido.")
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

function parseCursor(raw: string): { proposedAt: number; id: string } {
  const sep = raw.indexOf("_");
  return { proposedAt: Number(raw.slice(0, sep)), id: raw.slice(sep + 1) };
}

personLinksRouter.get(
  "/queue",
  rateLimit({ scope: "public:person-links:queue", limit: 120 }),
  requireCapability("person:search"),
  validate({ query: queueQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as z.infer<typeof queueQuery>;
    const items = await service.listQueue({
      status: q.status,
      before: q.before ? parseCursor(q.before) : null,
      limit: q.limit,
    });
    res.json({ items });
  }),
);

// ------------------------------------------------------------------ decision ---

const decisionParams = z.object({ linkId: z.string().min(1, "Falta el id del vínculo.") });
const decisionBody = z
  .object({
    decision: z.enum(["confirmar", "rechazar", "inseguro"]),
    note: z.string().trim().max(2000).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.decision === "inseguro" && !(val.note && val.note.length >= 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La nota es obligatoria para marcar un vínculo como inseguro.",
        path: ["note"],
      });
    }
  });

const DECISION_AUDIT_ACTION: Record<"confirmar" | "rechazar" | "inseguro", string> = {
  confirmar: "personlink.confirm",
  rechazar: "personlink.reject",
  inseguro: "personlink.unsure",
};

personLinksRouter.post(
  "/:linkId/decision",
  rateLimit({ scope: "public:person-links:decision", limit: 120 }),
  requireCapability("person:review"),
  validate({ params: decisionParams, body: decisionBody }),
  asyncHandler(async (req, res) => {
    const { linkId } = req.params as z.infer<typeof decisionParams>;
    const { decision, note } = req.body as z.infer<typeof decisionBody>;

    // Pre-check de anclaje: NO autoritativo (ver R18/decideLink) — solo
    // resuelve la capacidad UNA vez aquí para pasársela al servicio, que
    // hace el chequeo real DESPUÉS del claim (protege contra TOCTOU).
    const actorHasMerge = await userHasCapability(req.user!, "person:merge", req.capCache);

    const result = await service.decideLink({
      linkId,
      decision,
      note: note ?? "",
      actorId: req.user!.id,
      actorHasMergeCapability: actorHasMerge,
    });

    await writeAudit(req, {
      action: DECISION_AUDIT_ACTION[decision],
      targetType: "person_link",
      targetId: linkId,
      metadata: { decision, idempotentReplay: result.idempotentReplay },
    });
    if (result.anchoredMergeExecuted) {
      await writeAudit(req, {
        action: "cluster.merge",
        targetType: "person_link",
        targetId: linkId,
        metadata: { prnA: result.link.prnA, prnB: result.link.prnB },
      });
    }

    res.json({ item: result.link, idempotentReplay: result.idempotentReplay });
  }),
);

// ------------------------------------------------------------------- propose ---

const proposeBody = z.object({
  prnA: z.string().trim().min(1, "Falta prnA."),
  prnB: z.string().trim().min(1, "Falta prnB."),
});

personLinksRouter.post(
  "/propose",
  rateLimit({ scope: "public:person-links:propose", limit: 60 }),
  requireCapability("person:review"),
  validate({ body: proposeBody }),
  asyncHandler(async (req, res) => {
    const { prnA, prnB } = req.body as z.infer<typeof proposeBody>;
    const result = await service.manualProposeLink({ prnA, prnB, actorId: req.user!.id });

    await writeAudit(req, {
      action: "personlink.propose",
      targetType: "person_link",
      targetId: result.link.id,
      metadata: { prnA: result.link.prnA, prnB: result.link.prnB, created: result.created },
    });

    res.status(result.created ? 201 : 200).json({ item: result.link, created: result.created });
  }),
);

// ------------------------------------------------------------------- unmerge ---

const unmergeParams = z.object({ linkId: z.string().min(1, "Falta el id del vínculo.") });
const unmergeBody = z.object({ note: z.string().trim().max(2000).optional() });

personLinksRouter.post(
  "/:linkId/unmerge",
  rateLimit({ scope: "public:person-links:unmerge", limit: 30 }),
  requireCapability("person:merge"),
  validate({ params: unmergeParams, body: unmergeBody }),
  asyncHandler(async (req, res) => {
    const { linkId } = req.params as z.infer<typeof unmergeParams>;
    const { note } = req.body as z.infer<typeof unmergeBody>;

    const result = await service.unmergeLink({ linkId, actorId: req.user!.id, note });

    await writeAudit(req, {
      action: "personlink.unmerge",
      targetType: "person_link",
      targetId: linkId,
      metadata: { prnA: result.prnA, prnB: result.prnB },
    });

    res.json({ item: result.link });
  }),
);

// ------------------------------------------------------------ records/search ---

const recordsSearchQuery = z.object({
  q: z.string().trim().min(1, "Falta el término de búsqueda."),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

personLinksRouter.get(
  "/records/search",
  rateLimit({ scope: "public:person-links:records-search", limit: 120 }),
  requireCapability("person:search"),
  validate({ query: recordsSearchQuery }),
  asyncHandler(async (req, res) => {
    // `as unknown` intermedio: recordsSearchQuery tiene `q` requerido y TS
    // rechaza la conversión directa desde ParsedQs (audit.router no lo
    // necesita porque su schema es todo-opcional).
    const q = req.query as unknown as z.infer<typeof recordsSearchQuery>;
    const result = await service.searchRecords(q.q, q.limit);
    res.json(result);
  }),
);

// ------------------------------------------------------------- clusters/:id ---

const clusterParams = z.object({ clusterId: z.string().min(1, "Falta el id del cluster.") });

personLinksRouter.get(
  "/clusters/:clusterId",
  rateLimit({ scope: "public:person-links:cluster", limit: 120 }),
  requireCapability("person:search"),
  validate({ params: clusterParams }),
  asyncHandler(async (req, res) => {
    const { clusterId } = req.params as z.infer<typeof clusterParams>;
    const ficha = await getClusterFicha(clusterId);
    if (!ficha) throw notFound("Cluster no encontrado.");
    res.json({ item: ficha });
  }),
);
