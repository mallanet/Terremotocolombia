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
  it("usa el hero de marca, que ya trae el velo oscuro sobre la imagen", () => {
    expect(hero).toContain("e-hero__gradient");
    expect(hero).toContain("e-hero__bg-image");
    expect(hero).toContain("e-hero__bg-overlay");
  });

  it("no trae una imagen propia: la foto se cambia en el CSS de marca", () => {
    expect(hero).not.toMatch(/background-image|<img|next\/image/);
  });

  it("la landing lo monta y sus botones tienen destino", () => {
    expect(page).toContain("<CampaignHero");
    expect(hero).toContain('href="#registrar"');
    expect(hero).toContain('href="#puntos"');
    expect(page).toContain('id="registrar"');
    expect(page).toContain('id="puntos"');
  });
});
