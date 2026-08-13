const STORAGE_KEY = "acopio.editTokens";

function readMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

export function saveAcopioEditToken(reportId: string, token: string): void {
  if (typeof window === "undefined") return;
  const next = { ...readMap(), [reportId]: token };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getAcopioEditToken(reportId: string): string | null {
  const token = readMap()[reportId];
  return token && token.length > 0 ? token : null;
}

export function acopioReportId(centerId: string): string | null {
  return centerId.startsWith("report:") ? centerId.slice("report:".length) : null;
}
