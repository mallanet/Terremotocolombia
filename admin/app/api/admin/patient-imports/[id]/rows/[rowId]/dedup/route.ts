import type { NextResponse } from "next/server";
import { createAuthedEmergencyClient } from "../../../../../../../../src/shared/http/authed-fetch";
import { json, mapApiError, unauthorized } from "../../../../../../_shared/proxy";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; rowId: string }> },
): Promise<NextResponse> {
  const client = createAuthedEmergencyClient(request);
  if (!client) return unauthorized();
  const { id, rowId } = await context.params;
  const result = await client.post<unknown>(
    `/api/public/patient-imports/${encodeURIComponent(id)}/rows/${encodeURIComponent(rowId)}/dedup`,
    await request.json(),
  );
  return result.ok ? json(result.value, 200) : mapApiError(result.error);
}
