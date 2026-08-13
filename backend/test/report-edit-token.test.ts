import { describe, expect, it } from "vitest";
import "./helpers";
import {
  issueReportEditToken,
  reportEditTokenMatches,
} from "@/lib/report-edit-token";

describe("report edit token", () => {
  it("acepta el token emitido para el mismo id", () => {
    const token = issueReportEditToken("report-1");
    expect(token.length).toBe(64);
    expect(reportEditTokenMatches("report-1", token)).toBe(true);
  });

  it("rechaza otro id o un token recortado", () => {
    const token = issueReportEditToken("report-1");
    expect(reportEditTokenMatches("report-2", token)).toBe(false);
    expect(reportEditTokenMatches("report-1", token.slice(0, 16))).toBe(false);
    expect(reportEditTokenMatches("report-1", "")).toBe(false);
  });
});
