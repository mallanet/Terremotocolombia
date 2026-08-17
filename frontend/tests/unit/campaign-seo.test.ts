import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { collectionPointsSchema } from "@/lib/jsonld-campaign";
import { CAMPAIGN_FAQS } from "@/components/features/campaign/CampaignFaq";
import type { CampaignSite } from "@/lib/campaign-materials";

const ROOT = join(__dirname, "..", "..");
const PAGE = readFileSync(
  join(ROOT, "app/(content)/reconstruccion/page.tsx"),
  "utf8",
);
const FAQ = readFileSync(
  join(ROOT, "components/features/campaign/CampaignFaq.tsx"),
  "utf8",
);
const LLMS = readFileSync(join(ROOT, "public/llms.txt"), "utf8");

function site(overrides: Partial<CampaignSite> = {}): CampaignSite {
  return {
    id: "demo-1",
    name: "Punto demo",
    city: "Ciudad Demo",
    address: "Calle Demo 1",
    lat: 4.6,
    lng: -74.1,
    schedule: "Lunes a viernes, 8:00 a 17:00",
    contact: "",
    accepts: ["cemento", "varilla"],
    status: "active",
    note: "",
    ...overrides,
  };
}

describe("puntos de recolección en JSON-LD", () => {
  it("describes an open point with address, coordinates and what it takes", () => {
    const schema = collectionPointsSchema([site()]);
    const first = (schema?.itemListElement as Array<Record<string, never>>)[0];
    const place = first.item as unknown as Record<string, unknown>;

    expect(schema?.["@type"]).toBe("ItemList");
    expect(schema?.numberOfItems).toBe(1);
    expect(place.name).toBe("Punto demo");
    expect(place.description).toContain("Cemento");
    expect(place.geo).toMatchObject({ latitude: 4.6, longitude: -74.1 });
    expect(place.address).toMatchObject({ addressLocality: "Ciudad Demo" });
  });

  it("leaves out a point that cannot take material today", () => {
    const closed = ["paused", "full", "closed"].map((status) =>
      site({ status }),
    );
    expect(collectionPointsSchema(closed)).toBeNull();
  });

  it("omits the coordinates it does not have, instead of inventing them", () => {
    const schema = collectionPointsSchema([site({ lat: null, lng: null })]);
    const first = (schema?.itemListElement as Array<Record<string, never>>)[0];
    expect(first.item).not.toHaveProperty("geo");
  });
});

describe("marcado de la campaña", () => {
  it("emits the page, the questions and the points", () => {
    expect(PAGE).toContain("webPageSchema");
    expect(PAGE).toContain("faqSchema(CAMPAIGN_FAQS)");
    expect(PAGE).toContain("collectionPointsSchema");
  });

  it("shows on the page the same questions it marks up", () => {
    expect(PAGE).toContain("<CampaignFaq />");
    expect(FAQ).toContain("CAMPAIGN_FAQS.map");
    expect(CAMPAIGN_FAQS.length).toBeGreaterThanOrEqual(5);
  });

  it("answers with facts the system can back", () => {
    const answers = CAMPAIGN_FAQS.map((faq) => faq.answer).join(" ");
    expect(answers).toContain("diez caracteres");
    expect(answers).toContain("No se suman");
  });

  it("tells the agents that read llms.txt that the campaign exists", () => {
    expect(LLMS).toContain("/reconstruccion");
    expect(LLMS).toContain("/apoyanos");
  });
});
