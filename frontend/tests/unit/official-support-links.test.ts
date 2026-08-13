import { describe, expect, it } from "vitest";
import {
  OFFICIAL_QUICK_PHONES,
  OFFICIAL_QUICK_WEBS,
  telHref,
} from "@/lib/official-support-links";

describe("official-support-links", () => {
  it("incluye las líneas 1XY de acceso rápido", () => {
    const phones = OFFICIAL_QUICK_PHONES.map((item) => item.phone);
    expect(phones).toEqual(
      expect.arrayContaining(["123", "111", "106", "132", "144", "119"]),
    );
  });

  it("enlaza portales oficiales SGC, UNGRD y Cruz Roja", () => {
    const hosts = OFFICIAL_QUICK_WEBS.map((item) => new URL(item.href).hostname);
    expect(hosts).toEqual(
      expect.arrayContaining([
        "www.sgc.gov.co",
        "portal.gestiondelriesgo.gov.co",
        "www.cruzrojacolombiana.org",
      ]),
    );
  });

  it("telHref normaliza display a esquema tel:", () => {
    expect(telHref("123")).toBe("tel:123");
    // Fixture sintético: el audit proscribe literales E.164 (+ seguido de 9+
    // dígitos). Nacional cubre el strip de espacios; "+57 123" cubre el "+".
    expect(telHref("300 123 4567")).toBe("tel:3001234567");
    expect(telHref("+57 123")).toBe("tel:+57123");
  });
});
