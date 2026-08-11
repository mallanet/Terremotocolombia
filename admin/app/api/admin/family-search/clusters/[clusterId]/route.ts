/**
 * BFF /api/admin/family-search/clusters/:clusterId — proxy a
 * GET /api/public/person-links/clusters/:clusterId (person:search). 404 si el
 * cluster no existe (mapApiError propaga el status <500 tal cual).
 */
import type { NextResponse } from "next/server";
import { createAuthedEmergencyClient } from "../../../../../../src/shared/http/authed-fetch";
import { json, mapApiError, unauthorized } from "../../../../_shared/proxy";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ clusterId: string }> },
): Promise<NextResponse> {
  const client = createAuthedEmergencyClient(request);
  if (!client) return unauthorized();
  const { clusterId } = await context.params;
  const result = await client.get<unknown>(
    `/api/public/person-links/clusters/${encodeURIComponent(clusterId)}`,
  );
  return result.ok ? json(result.value, 200) : mapApiError(result.error);
}
