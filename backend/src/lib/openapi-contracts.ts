/**
 * Contract-backed OpenAPI overlay. Migrated public routes register shared
 * Zod schemas here. JSDoc and crud-factory paths stay for everything else.
 *
 * Do not put edit-token example values in this file.
 */
import { z } from "zod";
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import {
  errorEnvelopeSchema,
  healthOkSchema,
  needPublicationStatusSchema,
  needPublishAcceptedSchema,
  reportConfirmDuplicateSchema,
  reportConfirmOkSchema,
  reportCreateResponseSchema,
  reportDetailSchema,
  reportEditResponseSchema,
  reportsListSchema,
} from "@mallanet/contracts";
import type { OpenApiOperationId } from "@/lib/openapi-canonical";

extendZodWithOpenApi(z);

const stringId = {
  name: "id",
  in: "path" as const,
  required: true,
  schema: { type: "string" as const },
};

const jobIdParam = {
  name: "jobId",
  in: "path" as const,
  required: true,
  schema: { type: "string" as const },
};

export const CONTRACT_OPERATIONS: readonly OpenApiOperationId[] = [
  { method: "get", path: "/api/healthz" },
  { method: "get", path: "/api/readyz" },
  { method: "get", path: "/api/reports" },
  { method: "post", path: "/api/reports" },
  { method: "get", path: "/api/reports/{id}" },
  { method: "patch", path: "/api/reports/{id}" },
  { method: "post", path: "/api/reports/{id}/confirm" },
  { method: "get", path: "/api/reports/{id}/photo" },
  { method: "post", path: "/api/needs" },
  { method: "get", path: "/api/needs/status/{jobId}" },
];

export function isContractOperation(op: OpenApiOperationId): boolean {
  return CONTRACT_OPERATIONS.some(
    (item) => item.method === op.method && item.path === op.path,
  );
}

export function buildContractOpenApiOverlay(): {
  paths: Record<string, unknown>;
  components: Record<string, unknown>;
} {
  const registry = new OpenAPIRegistry();
  const json = (schema: z.ZodType, description: string) => ({
    description,
    content: { "application/json": { schema } },
  });
  const errorJson = json(errorEnvelopeSchema, "Error");

  registry.registerPath({
    method: "get",
    path: "/api/healthz",
    tags: ["system"],
    summary: "Liveness",
    responses: { 200: json(healthOkSchema, "Process is up") },
  });
  registry.registerPath({
    method: "get",
    path: "/api/readyz",
    tags: ["system"],
    summary: "Readiness",
    responses: {
      200: json(healthOkSchema, "Database reachable"),
      503: json(healthOkSchema, "Database unreachable"),
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/reports",
    tags: ["reports"],
    summary: "Public report page",
    responses: { 200: json(reportsListSchema, "Canonical page plus persistent") },
  });
  registry.registerPath({
    method: "post",
    path: "/api/reports",
    tags: ["reports"],
    summary: "Create a public report",
    responses: {
      201: json(reportCreateResponseSchema, "Created. editToken is request-scoped."),
      400: errorJson,
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/reports/{id}",
    tags: ["reports"],
    summary: "Public report detail",
    parameters: [stringId],
    responses: {
      200: json(reportDetailSchema, "One report. No edit token."),
      404: errorJson,
    },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/reports/{id}",
    tags: ["reports"],
    summary: "Edit a public report with a one-time token",
    parameters: [stringId],
    responses: {
      200: json(reportEditResponseSchema, "Updated report"),
      403: errorJson,
      404: errorJson,
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/reports/{id}/confirm",
    tags: ["reports"],
    summary: "Confirm a public report",
    parameters: [stringId],
    responses: {
      200: json(reportConfirmOkSchema, "Confirmation recorded"),
      409: json(reportConfirmDuplicateSchema, "Already confirmed from this IP hash"),
      404: errorJson,
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/reports/{id}/photo",
    tags: ["reports"],
    summary: "Public report photo",
    parameters: [stringId],
    responses: {
      200: {
        description: "Image bytes",
        content: {
          "image/*": { schema: { type: "string", format: "binary" } },
        },
      },
      302: { description: "Redirect to object storage" },
      404: { description: "Not found" },
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/needs",
    tags: ["needs"],
    summary: "Queue a supply-need publication",
    responses: {
      202: json(needPublishAcceptedSchema, "Queued. Poll status with jobId."),
      400: errorJson,
      503: errorJson,
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/needs/status/{jobId}",
    tags: ["needs"],
    summary: "Need publication job status",
    parameters: [jobIdParam],
    responses: {
      200: json(
        needPublicationStatusSchema,
        "Public result only. No citizen payload.",
      ),
      404: errorJson,
    },
  });

  const generator = new OpenApiGeneratorV3(registry.definitions);
  const doc = generator.generateDocument({
    openapi: "3.0.3",
    info: { title: "contracts", version: "1.0.0" },
  });
  return {
    paths: (doc.paths ?? {}) as Record<string, unknown>,
    components: (doc.components ?? {}) as Record<string, unknown>,
  };
}

export function mergeContractOverlay(
  base: Record<string, unknown>,
  overlay: { paths: Record<string, unknown>; components: Record<string, unknown> },
): Record<string, unknown> {
  const basePaths = (base.paths ?? {}) as Record<string, Record<string, unknown>>;
  const mergedPaths: Record<string, Record<string, unknown>> = { ...basePaths };
  for (const [path, item] of Object.entries(overlay.paths)) {
    const overlayItem = item as Record<string, unknown>;
    mergedPaths[path] = { ...(mergedPaths[path] ?? {}), ...overlayItem };
  }
  const baseComponents = (base.components ?? {}) as Record<string, Record<string, unknown>>;
  const overlayComponents = overlay.components as Record<string, Record<string, unknown>>;
  return {
    ...base,
    paths: mergedPaths,
    components: {
      ...baseComponents,
      ...overlayComponents,
      schemas: {
        ...(baseComponents.schemas ?? {}),
        ...(overlayComponents.schemas ?? {}),
      },
      securitySchemes: {
        ...(baseComponents.securitySchemes ?? {}),
        ...(overlayComponents.securitySchemes ?? {}),
      },
    },
  };
}
