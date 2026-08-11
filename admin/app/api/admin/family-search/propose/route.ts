/**
 * BFF /api/admin/family-search/propose — proxy a
 * POST /api/public/person-links/propose (person:review).
 *
 * El backend responde 201 (fila nueva) o 200 (ya existía, abierta —
 * idempotente); el `HttpClient` de este BFF no conserva el status exacto de
 * un 2xx (ver http-client.ts), así que aquí siempre se devuelve 200 — el
 * body trae `created: boolean`, que es la señal que el cliente realmente usa.
 */
import type { NextResponse } from "next/server";
import { createAuthedEmergencyClient } from "../../../../../src/shared/http/authed-fetch";
import { json, mapApiError, unauthorized } from "../../../_shared/proxy";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const client = createAuthedEmergencyClient(request);
  if (!client) return unauthorized();
  const result = await client.post<unknown>("/api/public/person-links/propose", await request.json());
  return result.ok ? json(result.value, 200) : mapApiError(result.error);
}
