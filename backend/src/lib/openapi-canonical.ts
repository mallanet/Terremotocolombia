/** Recursively sort object keys so two generations can compare byte-for-byte. */
export function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }
  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort()) {
      output[key] = canonicalizeJson(input[key]);
    }
    return output;
  }
  return value;
}

export function serializeCanonicalJson(value: unknown): string {
  return `${JSON.stringify(canonicalizeJson(value), null, 2)}\n`;
}

const HTTP_METHODS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
]);

export type OpenApiOperationId = {
  method: string;
  path: string;
};

export function listOpenApiOperations(spec: {
  paths?: Record<string, Record<string, unknown> | undefined> | undefined;
}): OpenApiOperationId[] {
  const out: OpenApiOperationId[] = [];
  for (const path of Object.keys(spec.paths ?? {}).sort()) {
    const item = spec.paths?.[path] ?? {};
    for (const method of Object.keys(item).sort()) {
      if (!HTTP_METHODS.has(method)) continue;
      out.push({ method, path });
    }
  }
  return out;
}

export function operationKey(op: OpenApiOperationId): string {
  return `${op.method.toUpperCase()} ${op.path}`;
}
