import { describe, expect, it } from "vitest";
import { classifyClientError } from "@/lib/client-errors";

describe("classifyClientError", () => {
  it("classifies operational error families without returning the message", () => {
    expect(classifyClientError(new Error("Failed to fetch"))).toBe("network");
    expect(classifyClientError(new Error("Hydration failed"))).toBe("hydration");
    expect(classifyClientError({ name: "ChunkLoadError" })).toBe("stale_chunk");
    expect(classifyClientError(new Error("private form value"))).toBe("unknown");
  });
});
