import type { NextResponse } from "next/server";
import { createAuthedEmergencyClient } from "../../../../../../src/shared/http/authed-fetch";
import { json, mapApiError, unauthorized } from "../../../../_shared/proxy";

export const dynamic = "force-dynamic";

/**
 * BFF de la acción "Contactar" del panel: solo existe para volunteers (el
 * resto de modelos no tiene envío de mensaje → 404). Reenvía al backend, que
 * manda el correo y marca el registro pending → contacted.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ path: string; id: string }> },
): Promise<NextResponse> {
  const { path, id } = await context.params;
  if (path !== "volunteers") return json({ error: "Not found" }, 404);
  const client = createAuthedEmergencyClient(request);
  if (!client) return unauthorized();
  const result = await client.post<unknown>(
    `/api/public/volunteers/${encodeURIComponent(id)}/message`,
    await request.json(),
  );
  return result.ok ? json(result.value, 200) : mapApiError(result.error);
}
