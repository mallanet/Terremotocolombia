import { describe, expect, it } from "vitest";
import { mapViewZoom } from "@/lib/map-view-zoom";

describe("mapViewZoom", () => {
  it("en móvil acerca el encuadre al epicentro", () => {
    expect(mapViewZoom(9, true)).toBe(11);
  });

  it("en escritorio respeta el zoom de despliegue", () => {
    expect(mapViewZoom(9, false)).toBe(9);
  });
});
