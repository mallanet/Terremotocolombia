import { describe, expect, it } from "vitest";
import {
  CHECKIN_AVAILABILITY,
  CHECKIN_LEAD,
} from "@/components/features/voluntariado/checkin-copy";
import { FIELD_ROLES } from "@/components/features/volunteers/volunteer-options";

describe("check-in de campo", () => {
  it("pide ubicación, disponibilidad, talento, área y reporte", () => {
    expect(CHECKIN_LEAD).toMatch(/ubicación/);
    expect(CHECKIN_LEAD).toMatch(/disponibilidad/);
    expect(CHECKIN_LEAD).toMatch(/talento/);
    expect(CHECKIN_LEAD).toMatch(/área de acción/);
    expect(CHECKIN_LEAD).toMatch(/reporte/);
  });

  it("reusa roles de terreno y disponibilidades cortas", () => {
    expect(FIELD_ROLES.length).toBeGreaterThan(0);
    expect(CHECKIN_AVAILABILITY).toEqual(["Hoy", "Esta semana", "Puntual"]);
  });
});
