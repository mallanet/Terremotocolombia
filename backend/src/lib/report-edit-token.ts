import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/config/env";

function secret(): string {
  return env.JWT_SECRET || env.IP_SALT || "";
}

export function issueReportEditToken(reportId: string): string {
  return createHmac("sha256", secret()).update(`report-edit:${reportId}`).digest("hex");
}

export function reportEditTokenMatches(reportId: string, token: string): boolean {
  const expected = issueReportEditToken(reportId);
  const got = (token ?? "").trim();
  if (!got || got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(got));
}
