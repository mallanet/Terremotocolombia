import type { NextResponse } from "next/server";
import { createAuthedEmergencyClient } from "../../../../../../src/shared/http/authed-fetch";
import { json, mapApiError, unauthorized } from "../../../../_shared/proxy";

export const dynamic = "force-dynamic";

/**
 * BFF de la acción "Asignar" del tablero de tareas: solo existe para
 * volunteer-tasks. Reenvía al backend, que crea la asignación con token y
 * envía el correo de bienvenida al voluntario.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ path: string; id: string }> },
): Promise<NextResponse> {
  const { path, id } = await context.params;
  if (path !== "volunteer-tasks") return json({ error: "Not found" }, 404);
  const client = createAuthedEmergencyClient(request);
  if (!client) return unauthorized();
  const result = await client.post<unknown>(
    `/api/public/volunteer-tasks/${encodeURIComponent(id)}/assign`,
    await request.json(),
  );
  return result.ok ? json(result.value, 200) : mapApiError(result.error);
}
