import { describe, expect, it } from "vitest";
import {
  checkOpenApiCoverage,
  expectedSource,
  parseCoverageManifest,
} from "@/lib/openapi-coverage";

const spec = {
  paths: {
    "/api/reports": { get: {}, post: {} },
    "/api/public/reports": { get: {} },
    "/api/acopio": { get: {} },
  },
};

describe("openapi coverage", () => {
  it("fails when a spec path is missing from the manifest", () => {
    const manifest = parseCoverageManifest({
      version: 1,
      required: [],
      routes: [
        { method: "get", path: "/api/reports", source: "contracts" },
        { method: "post", path: "/api/reports", source: "contracts" },
        { method: "get", path: "/api/public/reports", source: "legacy-crud" },
      ],
    });
    expect(checkOpenApiCoverage(spec, manifest)).toEqual([
      { code: "missing-from-manifest", detail: "GET /api/acopio" },
    ]);
  });

  it("fails when the manifest lists a path that the spec dropped", () => {
    const manifest = parseCoverageManifest({
      version: 1,
      required: [],
      routes: [
        { method: "get", path: "/api/reports", source: "contracts" },
        { method: "post", path: "/api/reports", source: "contracts" },
        { method: "get", path: "/api/public/reports", source: "legacy-crud" },
        { method: "get", path: "/api/acopio", source: "legacy-jsdoc" },
        { method: "get", path: "/api/gone", source: "legacy-jsdoc" },
      ],
    });
    expect(checkOpenApiCoverage(spec, manifest)).toEqual([
      { code: "missing-from-spec", detail: "GET /api/gone" },
    ]);
  });

  it("fails when a migrated route keeps a legacy source", () => {
    const manifest = parseCoverageManifest({
      version: 1,
      required: [],
      routes: [
        { method: "get", path: "/api/reports", source: "legacy-jsdoc" },
        { method: "post", path: "/api/reports", source: "contracts" },
        { method: "get", path: "/api/public/reports", source: "legacy-crud" },
        { method: "get", path: "/api/acopio", source: "legacy-jsdoc" },
      ],
    });
    expect(checkOpenApiCoverage(spec, manifest)[0]).toMatchObject({
      code: "wrong-source",
    });
  });

  it("fails when a required U16 route is absent", () => {
    const manifest = parseCoverageManifest({
      version: 1,
      required: [{ method: "get", path: "/api/earthquakes" }],
      routes: [
        { method: "get", path: "/api/reports", source: "contracts" },
        { method: "post", path: "/api/reports", source: "contracts" },
        { method: "get", path: "/api/public/reports", source: "legacy-crud" },
        { method: "get", path: "/api/acopio", source: "legacy-jsdoc" },
      ],
    });
    expect(checkOpenApiCoverage(spec, manifest)).toEqual([
      { code: "required-missing", detail: "GET /api/earthquakes" },
    ]);
  });

  it("rejects an invalid manifest", () => {
    expect(() => parseCoverageManifest({ version: 2, required: [], routes: [] })).toThrow(
      /version/,
    );
  });

  it("classifies public reports as contracts and admin CRUD as legacy-crud", () => {
    expect(expectedSource({ method: "post", path: "/api/reports" })).toBe("contracts");
    expect(expectedSource({ method: "get", path: "/api/public/reports" })).toBe("legacy-crud");
    expect(expectedSource({ method: "get", path: "/api/acopio" })).toBe("legacy-jsdoc");
    expect(
      expectedSource({ method: "post", path: "/api/public/patient-imports/{id}/retry" }),
    ).toBe("legacy-jsdoc");
  });
});
