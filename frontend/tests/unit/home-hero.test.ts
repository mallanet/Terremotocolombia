import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const CSS = readFileSync(join(ROOT, "styles/shell-layout.css"), "utf8");
const HERO = readFileSync(join(ROOT, "components/layout/HeroSection.tsx"), "utf8");
const IMAGE = join(ROOT, "public/portada/hero.jpg");

/** Por encima de esto, la portada pesa más de la cuenta en una red mala. */
const MAX_IMAGE_BYTES = 260_000;

describe("banner de la portada", () => {
  it("carries the image the CSS points at", () => {
    expect(CSS).toContain('url("/portada/hero.jpg")');
    expect(existsSync(IMAGE)).toBe(true);
  });

  it("keeps the veil painted over the image, not under it", () => {
    const image = HERO.indexOf("e-hero__bg-image");
    const overlay = HERO.indexOf("e-hero__bg-overlay");
    expect(image).toBeGreaterThan(-1);
    expect(overlay).toBeGreaterThan(image);
  });

  it("stays light enough for a phone on a bad connection", () => {
    expect(statSync(IMAGE).size).toBeLessThan(MAX_IMAGE_BYTES);
  });

  it("keeps the image behind the veil, never at full strength", () => {
    // El arreglo tentador cuando alguien dice "no se ve la foto" es subir esto
    // a 1. Ahí el titular blanco compite con el escombro y deja de leerse.
    const opacity = Number(
      CSS.match(/\.e-hero__bg-image\s*\{[\s\S]*?opacity:\s*([\d.]+)/)?.[1],
    );
    expect(opacity).toBeGreaterThan(0.2);
    expect(opacity).toBeLessThanOrEqual(0.6);
  });
});
