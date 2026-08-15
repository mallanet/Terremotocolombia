import { describe, expect, it } from "vitest";
import { buildOfficialDeceasedUrl } from "@/lib/official-deceased";

describe("buildOfficialDeceasedUrl", () => {
  it("builds an encoded paginated search URL", () => {
    expect(
      buildOfficialDeceasedUrl({ page: 2, pageSize: 12, q: "DEMO José" }),
    ).toBe("/api/deceased?page=2&pageSize=12&q=DEMO+Jos%C3%A9");
  });

  it("omits an absent search term", () => {
    expect(buildOfficialDeceasedUrl({ page: 1, pageSize: 12 })).toBe(
      "/api/deceased?page=1&pageSize=12",
    );
  });
});
