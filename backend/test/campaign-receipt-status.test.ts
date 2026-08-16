/**
 * Reglas de la campaña de reconstrucción que no tocan la base: cuándo una
 * entrega cierra el compromiso y cómo se normaliza el código del certificado.
 */
import { describe, expect, it } from "vitest";
import { receiptStatus, totalsByMaterial } from "@/services/campaign/receipt-status";
import {
  CODE_ALPHABET,
  normalizePledgeCode,
  PLEDGE_CODE_LENGTH,
  randomPledgeCode,
} from "@/services/campaign/pledge-code";

const line = (material: string, quantity: number) => ({ material, quantity, unit: "" });

describe("receiptStatus", () => {
  it("cierra el compromiso cuando llega todo lo prometido", () => {
    expect(receiptStatus([line("cemento", 10)], [line("cemento", 10)])).toBe("received");
  });

  it("marca parcial cuando llega menos de lo prometido", () => {
    expect(receiptStatus([line("cemento", 10)], [line("cemento", 4)])).toBe("partial");
  });

  it("marca parcial cuando falta uno de los materiales prometidos", () => {
    expect(
      receiptStatus([line("cemento", 5), line("teja", 20)], [line("cemento", 5)]),
    ).toBe("partial");
  });

  it("traer de más no penaliza: sigue siendo completa", () => {
    expect(receiptStatus([line("cemento", 5)], [line("cemento", 9)])).toBe("received");
  });

  it("traer material que no se prometió no rompe el cierre", () => {
    expect(
      receiptStatus([line("cemento", 5)], [line("cemento", 5), line("madera", 3)]),
    ).toBe("received");
  });

  it("suma varias líneas del mismo material antes de comparar", () => {
    expect(
      receiptStatus([line("cemento", 10)], [line("cemento", 6), line("cemento", 4)]),
    ).toBe("received");
    expect(totalsByMaterial([line("cemento", 6), line("cemento", 4)]).get("cemento")).toBe(10);
  });

  it("un compromiso vacío no puede quedar parcial", () => {
    expect(receiptStatus([], [])).toBe("received");
  });
});

describe("normalizePledgeCode", () => {
  it("acepta el código tal cual lo dicta la persona, con espacios y minúsculas", () => {
    expect(normalizePledgeCode(" a2b3 c4d5 e6 ")).toBe("A2B3C4D5E6");
  });

  it("descarta cualquier cosa que no sea alfanumérica", () => {
    expect(normalizePledgeCode("A2B3-C4D5/E6")).toBe("A2B3C4D5E6");
  });

  it("no devuelve más caracteres de los que tiene un código", () => {
    expect(normalizePledgeCode("A".repeat(40))).toHaveLength(PLEDGE_CODE_LENGTH);
  });
});

describe("randomPledgeCode", () => {
  it("no usa caracteres que se confunden al dictarlos (0/O, 1/I/L)", () => {
    for (const forbidden of ["0", "O", "1", "I", "L"]) {
      expect(CODE_ALPHABET).not.toContain(forbidden);
    }
  });

  it("genera códigos de longitud fija y dentro del alfabeto", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = randomPledgeCode();
      expect(code).toHaveLength(PLEDGE_CODE_LENGTH);
      expect(code).toMatch(new RegExp(`^[${CODE_ALPHABET}]+$`));
    }
  });

  it("no repite el mismo código en una tanda corta", () => {
    const codes = new Set(Array.from({ length: 300 }, () => randomPledgeCode()));
    expect(codes.size).toBe(300);
  });
});
