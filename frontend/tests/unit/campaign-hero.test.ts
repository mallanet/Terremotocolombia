import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..");
const hero = readFileSync(
  join(root, "components/features/campaign/CampaignHero.tsx"),
  "utf8",
);
const page = readFileSync(
  join(root, "app/(content)/reconstruccion/page.tsx"),
  "utf8",
);

describe("banner de la campaña", () => {
  it("usa el marco del hero de marca", () => {
    expect(hero).toContain("e-hero__gradient");
    expect(hero).toContain("e-hero__title");
  });

  it("lleva su propia imagen y un velo encima, para que el texto se lea", () => {
    expect(hero).toContain("/campana/hero.jpg");
    expect(hero).toMatch(/bg-slate-950\/\d+/);
  });

  it("no toca el fondo compartido de la portada", () => {
    expect(hero).not.toContain("e-hero__bg-image");
  });

  it("la landing lo monta y sus botones tienen destino", () => {
    expect(page).toContain("<CampaignHero");
    expect(hero).toContain('href="#registrar"');
    expect(hero).toContain('href="#puntos"');
    expect(page).toContain('id="registrar"');
    expect(page).toContain('id="puntos"');
  });
});
