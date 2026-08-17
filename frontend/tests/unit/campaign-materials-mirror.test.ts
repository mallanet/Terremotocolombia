/**
 * El catálogo de materiales está duplicado a propósito (backend valida,
 * frontend etiqueta), así que la única forma de que no se separen en silencio
 * es comprobarlo. Si alguien añade un material en un lado y no en el otro, el
 * formulario ofrecería una opción que la API rechaza con un 400.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CAMPAIGN_MATERIALS, MATERIAL_KEYS } from "@/lib/campaign-materials";

const BACKEND_CATALOG = path.join(
  process.cwd(),
  "..",
  "backend",
  "src",
  "lib",
  "campaign-materials.ts",
);

function backendCatalog(): Map<string, string> {
  const source = readFileSync(BACKEND_CATALOG, "utf8");
  const body = source.slice(
    source.indexOf("CAMPAIGN_MATERIALS = {"),
    source.indexOf("} as const;"),
  );
  const entries = new Map<string, string>();
  for (const match of body.matchAll(/^\s{2}(\w+):\s*\{[^}]*unit:\s*"([^"]+)"/gm)) {
    entries.set(match[1]!, match[2]!);
  }
  return entries;
}

describe("catálogo de materiales", () => {
  it("el frontend ofrece exactamente las claves que el backend acepta", () => {
    expect([...backendCatalog().keys()].sort()).toEqual([...MATERIAL_KEYS].sort());
  });

  it("las unidades dicen lo mismo en los dos lados", () => {
    for (const [key, unit] of backendCatalog()) {
      expect(CAMPAIGN_MATERIALS[key as keyof typeof CAMPAIGN_MATERIALS].unit).toBe(unit);
    }
  });

  it("cada material tiene etiqueta y unidad no vacías", () => {
    for (const key of MATERIAL_KEYS) {
      expect(CAMPAIGN_MATERIALS[key].label.length).toBeGreaterThan(0);
      expect(CAMPAIGN_MATERIALS[key].unit.length).toBeGreaterThan(0);
    }
  });
});
