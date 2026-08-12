import { describe, expect, it } from "vitest";
import { MAP_TUTORIAL_STEPS } from "@/components/features/emergency/map-tutorial-steps";
import {
  copyFor,
  reportFormTitle,
  reportSubmitLabel,
} from "@/components/features/emergency/report-form-helpers";
import { MAP_REPORT_TYPE_KEYS, REPORT_TYPES } from "@/lib/types";

describe("MAP_TUTORIAL_STEPS", () => {
  it("recorre capas, búsqueda y publicación", () => {
    expect(MAP_TUTORIAL_STEPS.map((s) => s.title)).toEqual([
      "Capas del mapa",
      "Busca una zona",
      "Publica un punto",
    ]);
  });

  it("separa pedidos de ofertas y aclara el toque suelto", () => {
    expect(MAP_TUTORIAL_STEPS[0].body).toMatch(/pedidos/i);
    expect(MAP_TUTORIAL_STEPS[0].body).toMatch(/tiene/i);
    expect(MAP_TUTORIAL_STEPS[2].body).toMatch(/toque suelto/i);
  });
});

describe("pedido vs suministro", () => {
  it("expone Solicitar ayuda y Tengo suministros en el mapa", () => {
    expect(MAP_REPORT_TYPE_KEYS).toContain("need");
    expect(MAP_REPORT_TYPE_KEYS).toContain("supplies");
    expect(REPORT_TYPES.need.label).toMatch(/solicitar ayuda/i);
    expect(REPORT_TYPES.supplies.label).toMatch(/tengo suministros/i);
  });

  it("el formulario de pedido pregunta qué necesitas", () => {
    expect(copyFor("need").needsLabel).toMatch(/necesitas/i);
    expect(reportFormTitle("need")).toBe("Solicitar ayuda");
    expect(reportSubmitLabel("need", false)).toBe("Publicar pedido");
  });

  it("el formulario de suministros pregunta qué ofreces", () => {
    expect(copyFor("supplies").needsLabel).toMatch(/ofreces/i);
    expect(copyFor("supplies").showAffected).toBe(false);
    expect(reportFormTitle("supplies")).toBe("Ofrecer suministros");
  });
});
