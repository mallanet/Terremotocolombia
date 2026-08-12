import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { deploymentConfig } from "@/lib/deployment-config";
import { organizationSchema } from "@/lib/jsonld";
import {
  COMMUNITY_CTA_LABEL,
  COMMUNITY_WHATSAPP_URL,
} from "@/lib/site";

const LLMS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "public",
  "llms.txt",
);

describe("community channel (CC-2…CC-6)", () => {
  it("exports COMMUNITY_WHATSAPP_URL from deployment config", () => {
    expect(COMMUNITY_WHATSAPP_URL).toBe(
      deploymentConfig.communityWhatsappUrl,
    );
    expect(COMMUNITY_WHATSAPP_URL).toBe(
      "https://chat.whatsapp.com/DR0kbPPw8TnL2FOJ09pwGH",
    );
  });

  it("does not export a Discord invite for community join", async () => {
    const site = await import("@/lib/site");
    expect(site).not.toHaveProperty("DISCORD_INVITE_URL");
    expect(JSON.stringify(site)).not.toMatch(/discord\.gg/i);
  });

  it("CTA label is volunteer WhatsApp copy without Discord", () => {
    expect(COMMUNITY_CTA_LABEL).toMatch(/WhatsApp/i);
    expect(COMMUNITY_CTA_LABEL).not.toMatch(/Discord/i);
    expect(COMMUNITY_CTA_LABEL).toBe(
      "¿Quieres ser voluntario? Únete a nuestra comunidad de WhatsApp",
    );
  });

  it("organizationSchema sameAs includes WhatsApp and excludes Discord", () => {
    const sameAs = organizationSchema().sameAs as string[];
    expect(sameAs).toContain(COMMUNITY_WHATSAPP_URL);
    expect(sameAs).toContain("https://mallanet.org");
    expect(sameAs.some((url) => /discord\.gg/i.test(url))).toBe(false);
  });

  it("llms.txt documents WhatsApp community and not Discord invite", () => {
    const llms = readFileSync(LLMS_PATH, "utf8");
    expect(llms).toMatch(
      /https:\/\/chat\.whatsapp\.com\/DR0kbPPw8TnL2FOJ09pwGH/,
    );
    expect(llms).not.toMatch(/discord\.gg/i);
  });
});
