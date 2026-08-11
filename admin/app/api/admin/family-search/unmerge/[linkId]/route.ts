/**
 * BFF /api/admin/family-search/unmerge/:linkId — proxy a
 * POST /api/public/person-links/:linkId/unmerge (person:merge).
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
    `/api/public/person-links/${encodeURIComponent(linkId)}/unmerge`,
    await request.json().catch(() => ({})),
  );
  return result.ok ? json(result.value, 200) : mapApiError(result.error);
}
