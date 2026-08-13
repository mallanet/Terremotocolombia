/**
 * BFF /api/admin/volunteer-analytics → /api/public/volunteer-analytics
 * Forwards since/refresh; Cache-Control: no-store via shared proxy helper.
 */
import type { NextResponse } from "next/server";
import { createAuthedEmergencyClient } from "../../../../src/shared/http/authed-fetch";
import { json, mapApiError, unauthorized } from "../../_shared/proxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const client = createAuthedEmergencyClient(request);
  if (!client) return unauthorized();

  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  for (const key of ["since", "refresh"]) {
    const v = searchParams.get(key);
    if (v !== null && v !== "") qs.set(key, v);
  }
  const path = `/api/public/volunteer-analytics${qs.toString() ? `?${qs}` : ""}`;
  const result = await client.get<unknown>(path);
  return result.ok ? json(result.value, 200) : mapApiError(result.error);
}
