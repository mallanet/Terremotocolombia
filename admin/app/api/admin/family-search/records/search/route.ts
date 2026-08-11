/**
 * BFF /api/admin/family-search/records/search — proxy a
 * GET /api/public/person-links/records/search (person:search).
 */
import type { NextResponse } from "next/server";
import { createAuthedEmergencyClient } from "../../../../../../src/shared/http/authed-fetch";
import { json, mapApiError, unauthorized } from "../../../../_shared/proxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const client = createAuthedEmergencyClient(request);
  if (!client) return unauthorized();

  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  for (const key of ["q", "limit"]) {
    const v = searchParams.get(key);
    if (v !== null) qs.set(key, v);
  }

  const path = `/api/public/person-links/records/search${qs.toString() ? `?${qs.toString()}` : ""}`;
  const result = await client.get<unknown>(path);
  return result.ok ? json(result.value, 200) : mapApiError(result.error);
}
