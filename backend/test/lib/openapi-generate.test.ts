import { describe, expect, it } from "vitest";
import { serializeCanonicalJson } from "@/lib/openapi-canonical";
import { serializeOpenApiSpec } from "@/lib/generate-openapi";

describe("openapi generation", () => {
  it("serializes two generations byte-for-byte the same", async () => {
    const first = await serializeOpenApiSpec();
    const second = await serializeOpenApiSpec();
    expect(second).toBe(first);
    expect(first.startsWith("{")).toBe(true);
  });

  it("canonicalizes object key order", () => {
    const a = serializeCanonicalJson({ b: 1, a: { d: 2, c: 3 } });
    const b = serializeCanonicalJson({ a: { c: 3, d: 2 }, b: 1 });
    expect(a).toBe(b);
  });

  it("registers migrated reports and needs without editToken examples", async () => {
    const spec = JSON.parse(await serializeOpenApiSpec()) as {
      paths: Record<string, Record<string, unknown>>;
    };
    expect(spec.paths["/api/reports"] && "post" in spec.paths["/api/reports"]).toBe(true);
    expect(spec.paths["/api/reports/{id}"] && "patch" in spec.paths["/api/reports/{id}"]).toBe(
      true,
    );
    expect(spec.paths["/api/needs"] && "post" in spec.paths["/api/needs"]).toBe(true);
    expect(spec.paths["/api/earthquakes"] && "get" in spec.paths["/api/earthquakes"]).toBe(true);
    const dumped = JSON.stringify(spec);
    expect(dumped).toContain("sync.fetchedAt");
    expect(dumped).not.toMatch(/"editToken"\s*:\s*\{[^}]*"example"/);
  });
});
