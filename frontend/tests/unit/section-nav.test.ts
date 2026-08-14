import { describe, expect, it } from "vitest";
import { SUPPORT_DIRECTORY_PATH } from "@/lib/section-nav";

describe("section navigation", () => {
  it("routes the help action to the available support directory", () => {
    expect(SUPPORT_DIRECTORY_PATH).toBe("/apoyo-disponible");
  });
});
