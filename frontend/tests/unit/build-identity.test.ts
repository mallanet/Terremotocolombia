import { describe, expect, it } from "vitest";
import { getAppBuildSha } from "@/lib/build-identity";

describe("getAppBuildSha", () => {
  it("returns dev when unset", () => {
    const previous = process.env.APP_BUILD_SHA;
    delete process.env.APP_BUILD_SHA;
    expect(getAppBuildSha()).toBe("dev");
    if (previous === undefined) delete process.env.APP_BUILD_SHA;
    else process.env.APP_BUILD_SHA = previous;
  });
});
