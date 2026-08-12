/**
 * Intent classifier (WU2) — frozen canvas V1 taxonomy + other/unclassified.
 * Priority: field_role → offer_types → digital skills → free-text offer.
 */
import { describe, expect, it } from "vitest";
import {
  INTENT_TAXONOMY,
  classifyVolunteerIntent,
  type IntentKey,
} from "@/services/volunteer-analytics/classify-intent";

const FROZEN_KEYS: IntentKey[] = [
  "digital_remote",
  "acopio",
  "field_logistics",
  "clinical_health",
  "general_hands",
  "cooking_food",
  "structural_eval",
  "psychosocial",
  "transport_driver",
  "donation",
  "other",
];

describe("INTENT_TAXONOMY (frozen canvas V1)", () => {
  it("exports exactly the canvas intent keys plus other", () => {
    expect(INTENT_TAXONOMY.map((t) => t.key)).toEqual(FROZEN_KEYS);
  });

  it("maps labels to canvas Spanish titles", () => {
    const byKey = Object.fromEntries(INTENT_TAXONOMY.map((t) => [t.key, t.label]));
    expect(byKey.digital_remote).toBe("Solo digital / remoto");
    expect(byKey.acopio).toBe("Acopio / centros");
    expect(byKey.field_logistics).toBe("Logística de campo");
    expect(byKey.clinical_health).toBe("Salud clínica");
    expect(byKey.general_hands).toBe("Manos generales (sin rol)");
    expect(byKey.cooking_food).toBe("Cocina y alimentación");
    expect(byKey.structural_eval).toBe("Evaluación estructural");
    expect(byKey.psychosocial).toBe("Apoyo psicosocial");
    expect(byKey.transport_driver).toBe("Transporte / chofer");
    expect(byKey.donation).toBe("Donación (dinero/especie)");
    expect(byKey.other).toBe("Sin clasificar");
  });
});

describe("classifyVolunteerIntent", () => {
  it("classifies structured field_role values to frozen keys", () => {
    expect(classifyVolunteerIntent({ fieldRole: "acopio" }).key).toBe("acopio");
    expect(classifyVolunteerIntent({ fieldRole: "logistica" }).key).toBe("field_logistics");
    expect(classifyVolunteerIntent({ fieldRole: "salud" }).key).toBe("clinical_health");
    expect(classifyVolunteerIntent({ fieldRole: "cocina" }).key).toBe("cooking_food");
    expect(classifyVolunteerIntent({ fieldRole: "evaluacion_estructural" }).key).toBe(
      "structural_eval",
    );
    expect(classifyVolunteerIntent({ fieldRole: "psicosocial" }).key).toBe("psychosocial");
    expect(classifyVolunteerIntent({ fieldRole: "transporte" }).key).toBe("transport_driver");
    expect(classifyVolunteerIntent({ fieldRole: "general" }).key).toBe("general_hands");
    expect(classifyVolunteerIntent({ fieldRole: "digital" }).key).toBe("digital_remote");
  });

  it("prefers field_role over offer_types / digital / free-text", () => {
    const result = classifyVolunteerIntent({
      fieldRole: "salud",
      offerTypes: ["transporte", "donacion"],
      digitalSkills: ["redes"],
      offer: "puedo cocinar y donar dinero",
    });
    expect(result.key).toBe("clinical_health");
  });

  it("falls back to offer_types when field_role is empty", () => {
    expect(classifyVolunteerIntent({ offerTypes: ["transporte"] }).key).toBe(
      "transport_driver",
    );
    expect(classifyVolunteerIntent({ offerTypes: ["donacion"] }).key).toBe("donation");
    expect(classifyVolunteerIntent({ offerTypes: ["dinero"] }).key).toBe("donation");
    expect(classifyVolunteerIntent({ offerTypes: ["especie"] }).key).toBe("donation");
  });

  it("falls back to digital skills → digital_remote when no role/types match", () => {
    expect(
      classifyVolunteerIntent({
        digitalSkills: ["verificacion_datos", "redes_sociales"],
      }).key,
    ).toBe("digital_remote");
  });

  it("falls back to free-text offer keywords", () => {
    expect(classifyVolunteerIntent({ offer: "Ayudo en centro de acopio" }).key).toBe("acopio");
    expect(classifyVolunteerIntent({ offer: "Médico disponible en clínica" }).key).toBe(
      "clinical_health",
    );
    expect(classifyVolunteerIntent({ offer: "Puedo cocinar para el albergue" }).key).toBe(
      "cooking_food",
    );
  });

  it("maps unmatched / empty input to other (unclassified)", () => {
    expect(classifyVolunteerIntent({}).key).toBe("other");
    expect(classifyVolunteerIntent({ fieldRole: "xyz_unknown" }).key).toBe("other");
    expect(classifyVolunteerIntent({ offer: "hola mundo sin señal" }).key).toBe("other");
  });

  it("returns taxonomy label with the key", () => {
    const result = classifyVolunteerIntent({ fieldRole: "acopio" });
    expect(result.label).toBe("Acopio / centros");
  });
});
