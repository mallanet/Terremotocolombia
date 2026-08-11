/**
 * Router `api/public/deletion-requests` — gestión de solicitudes de supresión
 * de datos (Ley 1581) para el panel admin. La ENTRADA ciudadana vive aparte
 * (POST /api/data-deletion, pública); aquí solo la operación del canal:
 *
 *   GET   /       (deletion:read)  lista (PII de solicitantes — por eso la
 *                                   lectura tiene su propia capacidad)
 *   PATCH /:id    (deletion:edit)  resolver / rechazar / reabrir
 *
 * Escrito a mano (dos claves, no el cuarteto CRUD). La lista devuelve el
 * envelope `{items}` de la fábrica CRUD — es lo que espera el gateway
 * genérico de modelos del panel. Todas las rutas: rateLimit +
 * requireCapability; la mutación además writeAudit (gates del ESLint).
 */
import { Router } from "express";
import { z } from "zod";
import { asyncHandler, rateLimit, validate } from "@/middleware";
import { requireCapability } from "@/middleware/auth";
import { writeAudit } from "@/auth/audit";
import { notFound } from "@/lib/errors";
import {
  DELETION_REQUEST_STATUSES,
  listDeletionRequests,
  updateDeletionRequestStatus,
} from "@/services/data-deletion";

export const deletionRequestsRouter = Router();

const idParams = z.object({ id: z.string().min(1, "Falta el id.") });
const patchBody = z.object({
  status: z.enum(DELETION_REQUEST_STATUSES),
});

deletionRequestsRouter.get(
  "/",
  rateLimit({ scope: "public:deletion:list", limit: 120 }),
  requireCapability("deletion:read"),
  asyncHandler(async (_req, res) => {
    res.json({ items: await listDeletionRequests() });
  }),
);

deletionRequestsRouter.patch(
  "/:id",
  rateLimit({ scope: "public:deletion:edit", limit: 60 }),
  requireCapability("deletion:edit"),
  validate({ params: idParams, body: patchBody }),
  asyncHandler(async (req, res) => {
    const id = (req.params as { id: string }).id;
    const { status } = req.body as z.infer<typeof patchBody>;
    const result = await updateDeletionRequestStatus(id, status);
    if (!result) throw notFound("Solicitud no encontrada.");
    await writeAudit(req, {
      action: "deletion-request.edit",
      targetType: "deletion-request",
      targetId: id,
      // Solo el CONTEO de envíos fallidos purgados (Ley 1581): nunca el
      // payload ni el email en metadata.
      metadata: { status, purgedFailedSubmissions: result.purgedFailedSubmissions },
    });
    res.json({ item: result.item });
  }),
);
