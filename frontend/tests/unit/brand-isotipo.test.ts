import { describe, it, expect } from "vitest";
import {
  brandIsotipoSrc,
  SITE_NAV_LOGO,
  SITE_NAV_LOGO_ON_DARK,
} from "@/lib/site";

// Surface-relative isotipo binding for public chrome.
// *-oscuro = light chrome surface; *-claro = dark chrome surface.
// Footer is always a dark surface → always claro.

describe("brandIsotipoSrc (nav dual binding)", () => {
  it("maps light surface to isotipo-oscuro", () => {
    expect(brandIsotipoSrc("light")).toBe("/brand/isotipo-oscuro.svg");
  });

  it("maps dark surface to isotipo-claro", () => {
    expect(brandIsotipoSrc("dark")).toBe("/brand/isotipo-claro.svg");
  });

  it("aligns with SITE_NAV_LOGO / SITE_NAV_LOGO_ON_DARK constants", () => {
    expect(brandIsotipoSrc("light")).toBe(SITE_NAV_LOGO);
    expect(brandIsotipoSrc("dark")).toBe(SITE_NAV_LOGO_ON_DARK);
  });
});

describe("footer always-claro", () => {
  it("resolves claro for light-theme footer context", () => {
    // Footer chrome is always dark; theme does not change the asset.
    expect(brandIsotipoSrc("dark")).toBe("/brand/isotipo-claro.svg");
  });

  it("resolves claro for dark-theme footer context", () => {
    expect(brandIsotipoSrc("dark")).toBe(SITE_NAV_LOGO_ON_DARK);
  });

  it("footer path is not the nav-light path", () => {
    const footerPath = brandIsotipoSrc("dark");
    const navLightPath = brandIsotipoSrc("light");
    expect(footerPath).not.toBe(navLightPath);
    expect(footerPath).not.toBe(SITE_NAV_LOGO);
  });
});
