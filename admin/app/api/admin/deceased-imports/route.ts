import type { NextResponse } from "next/server";
import { createAuthedEmergencyClient } from "../../../../src/shared/http/authed-fetch";
import { json, mapApiError, unauthorized } from "../../_shared/proxy";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const client = createAuthedEmergencyClient(request);
  if (!client) return unauthorized();
  const result = await client.post<unknown>(
    "/api/public/deceased-imports",
    await request.json(),
    undefined,
  );
  return result.ok ? json(result.value, 200) : mapApiError(result.error);
}
