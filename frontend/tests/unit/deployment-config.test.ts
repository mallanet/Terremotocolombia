import { describe, expect, it } from "vitest";
import { validateDeploymentConfig } from "@/lib/deployment-config";

const COMMUNITY_WA =
  "https://chat.whatsapp.com/DR0kbPPw8TnL2FOJ09pwGH";

function validConfig(overrides: Record<string, unknown> = {}) {
  return {
    orgName: "Example Org",
    productName: "Example Product",
    disasterName: "Example Disaster",
    disasterType: "earthquake",
    regionLabel: "Example Region",
    mapCenter: [4.5, -74.0] as [number, number],
    mapZoom: 9,
    languageTag: "es",
    contactEmail: "ops@example.org",
    communityWhatsappUrl: COMMUNITY_WA,
    domains: {
      web: "example.org",
      api: "api.example.org",
      admin: "admin.example.org",
    },
    ...overrides,
  };
}

describe("validateDeploymentConfig (CC-1)", () => {
  it("accepts a complete config with communityWhatsappUrl", () => {
    const result = validateDeploymentConfig(validConfig());
    expect(result.communityWhatsappUrl).toBe(COMMUNITY_WA);
    expect(result.orgName).toBe("Example Org");
  });

  it("rejects missing communityWhatsappUrl", () => {
    const { communityWhatsappUrl: _drop, ...without } = validConfig();
    expect(() => validateDeploymentConfig(without)).toThrow(
      /communityWhatsappUrl/,
    );
  });

  it("rejects empty communityWhatsappUrl", () => {
    expect(() =>
      validateDeploymentConfig(validConfig({ communityWhatsappUrl: "" })),
    ).toThrow(/communityWhatsappUrl/);
  });

  it("rejects unknown keys (closed schema)", () => {
    expect(() =>
      validateDeploymentConfig(validConfig({ inventado: "no" })),
    ).toThrow(/Unknown key/);
  });

  it("accepts a config without donationUrl (optional key)", () => {
    expect(validateDeploymentConfig(validConfig()).donationUrl).toBeUndefined();
  });

  it("accepts an https donationUrl", () => {
    const url = "https://buy.example.org/abc123";
    expect(validateDeploymentConfig(validConfig({ donationUrl: url })).donationUrl).toBe(url);
  });

  it("rejects a donationUrl that is not https", () => {
    expect(() =>
      validateDeploymentConfig(validConfig({ donationUrl: "http://buy.example.org/abc" })),
    ).toThrow(/donationUrl/);
  });

  it("accepts an https donationMonthlyUrl", () => {
    const url = "https://buy.example.org/monthly";
    const result = validateDeploymentConfig(validConfig({ donationMonthlyUrl: url }));
    expect(result.donationMonthlyUrl).toBe(url);
  });

  it("rejects a donationMonthlyUrl that is not https", () => {
    expect(() =>
      validateDeploymentConfig(validConfig({ donationMonthlyUrl: "http://buy.example.org/m" })),
    ).toThrow(/donationMonthlyUrl/);
  });
});
