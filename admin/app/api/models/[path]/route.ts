import { NextResponse } from "next/server";
import { createAuthedEmergencyClient } from "../../../../src/shared/http/authed-fetch";
import { getModel } from "../../../../src/contexts/models/model-registry";
import { createHttpModelsGateway } from "../../../../src/contexts/models/infrastructure/http-models-gateway";
import { listModel } from "../../../../src/contexts/models/application/list-model";
import { fichaFieldKeys } from "../../../../src/contexts/volunteers/ficha-fields";
import { BFF_CACHE_HEADERS } from "../../_shared/bff-cache";
import { json, mapApiError, unauthorized } from "../../_shared/proxy";

export const dynamic = "force-dynamic";

function displayedRow(row: Record<string, unknown>, fields: readonly string[]) {
  return Object.fromEntries(fields.filter((field) => field in row).map((field) => [field, row[field]]));
}

function listedFields(path: string, columnKeys: readonly string[]): string[] {
  const detail = path === "volunteers" ? fichaFieldKeys() : [];
  return [...new Set(["id", ...columnKeys, ...detail])];
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ path: string }> },
): Promise<NextResponse> {
  const { path } = await ctx.params;

  const model = getModel(path);
  if (!model) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: BFF_CACHE_HEADERS });
  }

  const client = createAuthedEmergencyClient(request);
  if (!client) return unauthorized();

  const fields = listedFields(path, model.columns.map((column) => column.key));
  const result = await listModel(createHttpModelsGateway(client), path, fields);
  if (result.ok) {
    return NextResponse.json(result.value, { status: 200, headers: BFF_CACHE_HEADERS });
  }

  return mapApiError(result.error);
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ path: string }> },
): Promise<NextResponse> {
  const { path } = await ctx.params;
  const model = getModel(path);
  if (!model?.createFields) return json({ error: "Not found" }, 404);
  const client = createAuthedEmergencyClient(request);
  if (!client) return unauthorized();
  const result = await createHttpModelsGateway(client).create(path, await request.json());
  const fields = listedFields(path, model.columns.map((column) => column.key));
  return result.ok ? json(displayedRow(result.value, fields), 201) : mapApiError(result.error);
}
