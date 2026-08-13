import { describe, expect, it } from "vitest";
import {
  mergeShelterReports,
  shelterReportToCenter,
} from "@/lib/acopio-from-reports";
import type { AcopioResponse } from "@/lib/acopio";

const emptyAcopio: AcopioResponse = {
  items: [
    {
      id: "co-static-1",
      name: "Oficial",
      manager: null,
      address: "Cali",
      city: "Cali",
      country: "Colombia",
      lat: 3.4,
      lng: -76.5,
      accepts: ["food"],
      contact: null,
      schedule: null,
      status: "active",
      verificationLevel: "official",
      disputed: false,
      description: null,
    },
  ],
  total: 1,
  facets: { byCountry: { Colombia: 1 }, byCategory: { food: 1 } },
};

describe("acopio from citizen reports", () => {
  it("mapea shelter y deduce categorías", () => {
    const center = shelterReportToCenter(
      {
        id: "r1",
        type: "shelter",
        lat: 4.8,
        lng: -75.7,
        place: "Banco de Alimentos",
        needs: "Agua y alimentos no perecederos",
      },
      "Colombia",
    );
    expect(center?.id).toBe("report:r1");
    expect(center?.verificationLevel).toBe("citizen");
    expect(center?.accepts).toEqual(expect.arrayContaining(["food", "water"]));
  });

  it("fusiona sin duplicar ids ya presentes", () => {
    const merged = mergeShelterReports(
      emptyAcopio,
      [
        {
          id: "r1",
          type: "shelter",
          lat: 4.8,
          lng: -75.7,
          place: "Nuevo",
          needs: "Agua",
        },
      ],
      "Colombia",
    );
    expect(merged?.items.map((c) => c.id)).toEqual(["co-static-1", "report:r1"]);
    const again = mergeShelterReports(
      merged,
      [
        {
          id: "r1",
          type: "shelter",
          lat: 4.8,
          lng: -75.7,
          place: "Nuevo",
          needs: "Agua",
        },
      ],
      "Colombia",
    );
    expect(again?.items.filter((c) => c.id === "report:r1")).toHaveLength(1);
  });

  it("filtra extras por categoría", () => {
    const merged = mergeShelterReports(
      emptyAcopio,
      [
        {
          id: "r1",
          type: "shelter",
          lat: 1,
          lng: 1,
          place: "A",
          needs: "Agua",
        },
      ],
      "Colombia",
      { category: "food" },
    );
    expect(merged?.items.map((c) => c.id)).toEqual(["co-static-1"]);
  });
});
