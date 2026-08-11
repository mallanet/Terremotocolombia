/**
 * BFF /api/admin/family-search/signals — proxy a
 * GET /api/public/record-signals (person:search). U15 — panel "Señales".
 *
 * Reenvía after/limit tal cual; el backend valida con zod (listQuery en
 * record-signals.router.ts) y gatea con requireCapability("person:search").
 * Mismo patrón que .../queue/route.ts.
 */
import type { NextResponse } from "next/server";
import { createAuthedEmergencyClient } from "../../../../../src/shared/http/authed-fetch";
import { json, mapApiError, unauthorized } from "../../../_shared/proxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const client = createAuthedEmergencyClient(request);
  if (!client) return unauthorized();

  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  for (const key of ["after", "limit"]) {
    const v = searchParams.get(key);
    if (v !== null) qs.set(key, v);
  }

  const path = `/api/public/record-signals${qs.toString() ? `?${qs.toString()}` : ""}`;
  const result = await client.get<unknown>(path);
  return result.ok ? json(result.value, 200) : mapApiError(result.error);
}
