/**
 * BFF /api/admin/family-search/signals/:signalId/decision — proxy a
 * POST /api/public/record-signals/:signalId/decision (person:review).
 * U15 — panel "Señales".
 *
 * Pasa el body tal cual (decision/note — zod los valida en el backend,
 * incluida la nota obligatoria para 'descartar') y propaga el status real:
 * 200 éxito (incluye replay idempotente), 409 conflicto (decidida por otra
 * persona). Mismo patrón que .../decision/[linkId]/route.ts.
 */
import type { NextResponse } from "next/server";
import { createAuthedEmergencyClient } from "../../../../../../../src/shared/http/authed-fetch";
import { json, mapApiError, unauthorized } from "../../../../../_shared/proxy";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ signalId: string }> },
): Promise<NextResponse> {
  const client = createAuthedEmergencyClient(request);
  if (!client) return unauthorized();
  const { signalId } = await context.params;
  const result = await client.post<unknown>(
    `/api/public/record-signals/${encodeURIComponent(signalId)}/decision`,
    await request.json(),
  );
  return result.ok ? json(result.value, 200) : mapApiError(result.error);
}
