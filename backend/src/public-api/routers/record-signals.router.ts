/**
 * Router `api/public/record-signals` — panel de revisión de U14 ("señal, no
 * verdad", R24/R25/R26/AE4): cola de transiciones de status reclamadas por
 * una fuente externa (partner-sync/worker de sync) y su decisión
 * (confirmar/descartar).
 *
 * Router escrito a mano (dos verbos, no CRUD estándar) — mismo criterio que
 * `person-links.router.ts`: rateLimit + requireCapability en cada ruta; la
 * mutación (decision) además writeAudit (gate que exige el ESLint del
 * repo). La lectura (GET /) NO audita — mismo criterio que `/queue` de
 * person-links.router.ts.
 */
import { Router } from "express";
import { z } from "zod";
import { asyncHandler, rateLimit, validate } from "@/middleware";
import { requireCapability } from "@/middleware/auth";
import { writeAudit } from "@/auth/audit";
import * as service from "@/services/record-signals";

export const recordSignalsRouter = Router();

// ------------------------------------------------------------------ list ---

const listQuery = z.object({
  // Cursor keyset compuesto, codificado "<createdAt>_<id>" — mismo idioma
  // que el `before` de person-links.router.ts, pero llamado `after` porque
  // la cola aquí es más-antigua-primero (ASC): el cursor continúa DESPUÉS
  // del último id visto, no antes.
  after: z
    .string()
    .regex(/^\d+_.+$/, "Cursor inválido.")
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

function parseCursor(raw: string): { createdAt: number; id: string } {
  const sep = raw.indexOf("_");
  return { createdAt: Number(raw.slice(0, sep)), id: raw.slice(sep + 1) };
}

recordSignalsRouter.get(
  "/",
  rateLimit({ scope: "public:record-signals:list", limit: 120 }),
  requireCapability("person:search"),
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as z.infer<typeof listQuery>;
    const items = await service.listPending({
      after: q.after ? parseCursor(q.after) : null,
      limit: q.limit,
    });
    res.json({ items });
  }),
);

// -------------------------------------------------------------- decision ---

const decisionParams = z.object({ signalId: z.string().min(1, "Falta el id de la señal.") });
const decisionBody = z
  .object({
    decision: z.enum(["confirmar", "descartar"]),
    note: z.string().trim().max(2000).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.decision === "descartar" && !(val.note && val.note.length >= 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La nota es obligatoria para descartar una señal.",
        path: ["note"],
      });
    }
  });

const DECISION_AUDIT_ACTION: Record<"confirmar" | "descartar", string> = {
  confirmar: "signal.confirm",
  descartar: "signal.dismiss",
};

recordSignalsRouter.post(
  "/:signalId/decision",
  rateLimit({ scope: "public:record-signals:decision", limit: 120 }),
  requireCapability("person:review"),
  validate({ params: decisionParams, body: decisionBody }),
  asyncHandler(async (req, res) => {
    const { signalId } = req.params as z.infer<typeof decisionParams>;
    const { decision, note } = req.body as z.infer<typeof decisionBody>;

    const result = await service.decideSignal({
      signalId,
      decision,
      note: note ?? "",
      actorId: req.user!.id,
    });

    await writeAudit(req, {
      action: DECISION_AUDIT_ACTION[decision],
      targetType: "record_status_signal",
      targetId: signalId,
      metadata: { decision, idempotentReplay: result.idempotentReplay },
    });

    res.json({ item: result.signal, idempotentReplay: result.idempotentReplay });
  }),
);
