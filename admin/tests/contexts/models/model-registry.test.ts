import { describe, expect, it } from "vitest";
import { MODELS, getModel } from "@/src/contexts/models/model-registry";

describe("model-registry", () => {
  it("expone los modelos administrables del backend public-api", () => {
    const paths = MODELS.map((m) => m.path).sort();
    expect(paths).toEqual(
      [
        "chat",
        "contact",
        "deletion-requests",
        "donations",
        "hospitals",
        "missing",
        "patients",
        "reports",
        "volunteers",
        "volunteer-tasks",
      ].sort(),
    );
  });

  it("cada modelo gatea por <path>:read", () => {
    for (const m of MODELS) {
      expect(m.readCapability).toBe(`${capabilityRoot(m.path)}:read`);
    }
  });

  it("getModel encuentra por path y devuelve undefined si no existe", () => {
    expect(getModel("reports")?.label).toBe("Reportes");
    expect(getModel("nope")).toBeUndefined();
  });

  it("cada modelo declara al menos una columna", () => {
    for (const m of MODELS) {
      expect(m.columns.length).toBeGreaterThan(0);
    }
  });
});

// El path plural del recurso vs la raíz singular de la capacidad
// (reports->report, missing->missing, hospitals->hospital, ...).
//
// Un recurso NUEVO puede además COMPARTIR la capacidad de otro, y aquí eso no
// es una excepción sino la regla: sembrar una clave de capacidad nueva es un
// paso humano (deny-by-default), así que una superficie que se inventa la suya
// responde 403 a todo el mundo hasta que alguien la siembre a mano. Por eso
// `volunteer-tasks` gatea por `volunteer:read` y no por `volunteer-tasks:read`.
function capabilityRoot(path: string): string {
  const map: Record<string, string> = {
    reports: "report",
    missing: "missing",
    hospitals: "hospital",
    patients: "patient",
    donations: "donation",
    chat: "chat",
    contact: "contact",
    "deletion-requests": "deletion",
    volunteers: "volunteer",
    "volunteer-tasks": "volunteer",
  };
  return map[path] ?? path;
}
