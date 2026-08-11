/**
 * BFF /api/admin/family-search/decision/:linkId — proxy a
 * POST /api/public/person-links/:linkId/decision (person:review).
 *
 * Pasa el body tal cual (decision/note — zod los valida en el backend) y
 * propaga el status real: 200 éxito (incluye replay idempotente), 409
 * conflicto (decidido por otra persona), 403 escalación de fusión anclada
 * (mensaje distintivo — ver AnchoredMergeEscalationError en
 * services/person-links.ts, .code no se serializa hoy, el cliente distingue
 * por el texto del mensaje).
 */
import type { NextResponse } from "next/server";
import { createAuthedEmergencyClient } from "../../../../../../src/shared/http/authed-fetch";
import { json, mapApiError, unauthorized } from "../../../../_shared/proxy";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ linkId: string }> },
): Promise<NextResponse> {
  const client = createAuthedEmergencyClient(request);
  if (!client) return unauthorized();
  const { linkId } = await context.params;
  const result = await client.post<unknown>(
    `/api/public/person-links/${encodeURIComponent(linkId)}/decision`,
    await request.json(),
  );
  return result.ok ? json(result.value, 200) : mapApiError(result.error);
}
