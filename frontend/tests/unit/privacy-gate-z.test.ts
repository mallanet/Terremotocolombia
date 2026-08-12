import { describe, expect, it } from "vitest";
import {
  PRIVACY_GATE_Z_INDEX,
  REPORT_MODAL_Z_INDEX,
  privacyGateStacksAbove,
} from "@/lib/privacy-gate-z";

describe("privacy gate stacking", () => {
  it("queda por encima del Sheet/Dialog de reportar", () => {
    expect(privacyGateStacksAbove(REPORT_MODAL_Z_INDEX)).toBe(true);
    expect(PRIVACY_GATE_Z_INDEX).toBeGreaterThan(2500);
  });
});
