/**
 * RED→GREEN: honest USGS / ~5 min copy; quiet ≠ error; no new time window.
 */
import { describe, expect, it } from "vitest";
import {
  EARTHQUAKES_CADENCE_COPY_ES,
  earthquakesPanelSubtitle,
  earthquakesQuietMessage,
  preservesListTimeWindow,
  resolveEarthquakesPanelView,
} from "@/lib/earthquakes-panel";

describe("earthquakes panel honesty", () => {
  it("names USGS and ~5 min cadence; never claims minute-level updates", () => {
    const sub = earthquakesPanelSubtitle("región demo");
    expect(sub).toContain("USGS");
    expect(sub).toContain("~5");
    expect(sub.toLowerCase()).not.toContain("cada minuto");
    expect(EARTHQUAKES_CADENCE_COPY_ES.toLowerCase()).not.toContain("cada minuto");
  });

  it("quiet when sync is healthy and the filtered list is empty", () => {
    expect(
      resolveEarthquakesPanelView({
        isLoading: false,
        isError: false,
        filteredCount: 0,
      }),
    ).toBe("quiet");
    const msg = earthquakesQuietMessage({
      minMag: 3,
      syncFetchedAt: Date.now() - 60_000,
      nowMs: Date.now(),
    });
    expect(msg.toLowerCase()).toContain("usgs");
    expect(msg.toLowerCase()).not.toMatch(/error|fallo|no se pudieron/);
  });

  it("error only on transport/API failure", () => {
    expect(
      resolveEarthquakesPanelView({
        isLoading: false,
        isError: true,
        filteredCount: 0,
      }),
    ).toBe("error");
  });

  it("does not add a Slice A time-window filter", () => {
    expect(preservesListTimeWindow(false)).toBe(true);
    expect(preservesListTimeWindow(true)).toBe(false);
  });
});
