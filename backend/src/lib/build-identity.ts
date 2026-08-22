/**
 * Non-sensitive build identifier. Set APP_BUILD_SHA at build and upload time
 * to the full git SHA. Local/dev falls back to "dev".
 */
export const APP_BUILD_SHA_HEADER = "x-app-build-sha";

export function getAppBuildSha(): string {
  const value = process.env.APP_BUILD_SHA;
  if (typeof value !== "string") return "dev";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "dev";
}
