/**
 * Hook contract: useEarthquakes returns the full { earthquakes, sync } envelope.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const hookSrc = readFileSync(
  path.resolve(here, "../../hooks/emergency.ts"),
  "utf8",
);

describe("useEarthquakes envelope contract", () => {
  it("keeps the full EarthquakesListResponse (does not strip to array-only)", () => {
    expect(hookSrc).toMatch(/EarthquakesListResponse/);
    expect(hookSrc).toMatch(
      /apiGet<EarthquakesResponse>\("\/api\/earthquakes", signal\)/,
    );
    // Must NOT map the response down to r.earthquakes ?? [] only.
    expect(hookSrc).not.toMatch(
      /\.then\(\s*\(r\)\s*=>\s*r\.earthquakes/,
    );
  });
});
