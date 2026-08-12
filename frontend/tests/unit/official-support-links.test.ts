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
    expect(telHref("+1 (555) 0100")).toBe("tel:+15550100");
  });
});
