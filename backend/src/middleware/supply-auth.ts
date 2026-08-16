/**
 * Auth de escritura de insumos hospitalarios. Portado desde lib/supply-auth.ts.
 *
 * Una escritura de insumos (semáforo / necesidad / ayuda) la puede hacer:
 *   - un admin (x-admin-token == ADMIN_PASSWORD), o
 *   - un POC del hospital con su token (x-hospital-poc-token) que matchee un
 *     hospital_poc_assignment ACTIVO de ESE hospital (hash sha256 del token).
 *
 * Importante (preserva la semántica del Next route previo): el POC token se
 * valida contra el `hospital.id` CANÓNICO, no contra el slug de la URL. Por eso
 * este middleware primero RESUELVE el hospital (service.getHospital) — si no
 * existe responde 404 ANTES de filtrar la auth, exactamente como las rutas Next.
 * El hospital resuelto queda en `res.locals.hospital` para que el handler no lo
 * vuelva a cargar.
 */
import { createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import type { RequestHandler } from "express";
import { getDb, schema } from "@/db";
import { env } from "@/config/env";
import { notFound, unauthorized } from "@/lib/errors";
import * as hospitalsService from "@/services/hospitals";

const POC_HEADER = "x-hospital-poc-token";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function isAdmin(req: { headers: Record<string, unknown> }): boolean {
  const expected = env.ADMIN_PASSWORD;
  const got = req.headers["x-admin-token"];
  if (!expected || typeof got !== "string") return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  // comparación constante
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i]! ^ b[i]!;
  return mismatch === 0;
}

async function hasPocAccess(token: string, hospitalId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.hospitalPocAssignments.id })
    .from(schema.hospitalPocAssignments)
    .where(
      and(
        eq(schema.hospitalPocAssignments.hospitalId, hospitalId),
        eq(schema.hospitalPocAssignments.active, true),
        eq(schema.hospitalPocAssignments.accessTokenHash, hashToken(token)),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function resolveSupplyAccess(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
): Promise<void> {
  const id = String(req.params.id ?? "");
  const hospital = await hospitalsService.getHospital(id, { includeSupplySummary: true });
  if (!hospital) throw notFound("Hospital no encontrado.");
  res.locals.hospital = hospital;

  if (isAdmin(req as unknown as { headers: Record<string, unknown> })) return;

  const raw = req.headers[POC_HEADER];
  const token = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (token && (await hasPocAccess(token, hospital.id))) return;

  throw unauthorized("No autorizado.");
}

/**
 * Middleware: resuelve el hospital (404 si no existe) y exige admin o POC del
 * hospital. Deja el hospital resuelto en res.locals.hospital.
 *
 * NO usa asyncHandler: ese helper solo propaga el error a next() y, cuando la
 * función termina bien, no llama a next(). Como middleware eso dejaba colgada
 * toda escritura AUTORIZADA de insumos hasta el timeout del cliente — el
 * rechazo respondía 401 al instante, que es justo por lo que no se notaba.
 */
export const requireSupplyWrite: RequestHandler = (req, res, next) => {
  resolveSupplyAccess(req, res).then(() => next(), next);
};

export { POC_HEADER };
