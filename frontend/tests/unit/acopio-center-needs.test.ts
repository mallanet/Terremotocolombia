import { describe, expect, it } from "vitest";
import { composeCenterNeeds } from "@/lib/acopio-center-needs";

describe("composeCenterNeeds", () => {
  it("arma el texto público del punto", () => {
    const text = composeCenterNeeds({
      accepts: ["food", "water"],
      schedule: "8 a 18",
      contact: "Cruz Roja local",
      notes: "No ropa",
    });
    expect(text).toContain("Alimentos");
    expect(text).toContain("Agua");
    expect(text).toContain("Horario: 8 a 18");
    expect(text).toContain("Contacto: Cruz Roja local");
    expect(text).toContain("No ropa");
  });
});
