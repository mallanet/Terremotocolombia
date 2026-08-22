import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { APP_BUILD_SHA_HEADER, getAppBuildSha } from "@/src/shared/build-identity";
import { healthOkSchema } from "@mallanet/contracts";

describe("GET /api/health", () => {
  it("returns 200 with ok and sha", async () => {
    const response = await GET();

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ ok: true, sha: getAppBuildSha() });
    expect(healthOkSchema.parse(body).ok).toBe(true);
    expect(response.headers.get(APP_BUILD_SHA_HEADER)).toBe(getAppBuildSha());
  });

  it("sets Cache-Control: no-store", async () => {
    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
