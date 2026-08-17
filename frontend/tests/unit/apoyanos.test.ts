import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const PAGE = readFileSync(join(ROOT, "app/(content)/apoyanos/page.tsx"), "utf8");
const CARD = readFileSync(
  join(ROOT, "components/features/support/SupportDonateCard.tsx"),
  "utf8",
);
const SITEMAP = readFileSync(join(ROOT, "app/sitemap.ts"), "utf8");

describe("/apoyanos", () => {
  it("reads both payment links from the deployment config, never inline", () => {
    expect(CARD).toContain("DONATION_MONTHLY_URL");
    expect(CARD).toContain("DONATION_URL");
    expect(CARD).not.toMatch(/https:\/\/buy\.stripe\.com/);
    expect(PAGE).not.toMatch(/https:\/\/buy\.stripe\.com/);
  });

  it("opens the payment page safely in a new tab", () => {
    const externals = CARD.match(/target="_blank"/g) ?? [];
    const guards = CARD.match(/rel="noopener noreferrer"/g) ?? [];
    expect(externals.length).toBeGreaterThan(0);
    expect(guards.length).toBe(externals.length);
  });

  it("hides an option when its deployment has no such link", () => {
    expect(CARD).toContain("{DONATION_MONTHLY_URL && <MonthlyOption />}");
    expect(CARD).toContain("{DONATION_URL && <OneOffOption />}");
  });

  it("uses its own illustrative image, not the shared hero background", () => {
    expect(PAGE).toContain("/apoyanos/hero.jpg");
    expect(PAGE).toContain("bg-slate-950/62");
  });

  it("is indexable in the sitemap", () => {
    expect(SITEMAP).toContain('path: "/apoyanos"');
    expect(PAGE).not.toContain("index: false");
  });
});

const FORM = readFileSync(
  join(ROOT, "components/features/support/DonateForm.tsx"),
  "utf8",
);
const THANKS = readFileSync(
  join(ROOT, "app/(content)/apoyanos/gracias/page.tsx"),
  "utf8",
);

describe("formulario de aporte", () => {
  it("sends a fresh Turnstile token per submit", () => {
    expect(FORM).toContain("useTurnstile");
    expect(FORM).toContain("await turnstileGetToken()");
    expect(FORM).toContain("turnstileToken");
  });

  it("asks for no personal data: Stripe collects what it needs", () => {
    expect(FORM).not.toMatch(/type="email"/);
    expect(FORM).not.toMatch(/name="(nombre|name|email|telefono|phone)"/i);
  });

  it("takes the amounts from the shared catalog, not from literals", () => {
    expect(FORM).toContain("SUGGESTED_AMOUNTS_CENTS");
    expect(FORM).toContain("MIN_DONATION_CENTS");
    expect(FORM).toContain("MAX_DONATION_CENTS");
  });

  it("goes through the hook, never a raw fetch", () => {
    expect(FORM).toContain("useDonationCheckout");
    expect(FORM).not.toContain("fetch(");
  });
});

describe("página de gracias", () => {
  it("stays out of the index and claims no confirmed payment", () => {
    // Sin los comentarios: ahí se explica justamente por qué no se afirma el
    // cobro, y la frase citada haría fallar la comprobación.
    const rendered = THANKS.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(THANKS).toContain("index: false");
    expect(rendered).not.toMatch(/pago (se )?complet/i);
  });
});
