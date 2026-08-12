import { trackOperationalEvent } from "@/lib/openpanel";

export type ClientErrorKind = "boundary" | "global-boundary" | "window" | "promise";

export function classifyClientError(error: unknown): string {
  const value = error as { name?: string; message?: string } | null;
  const text = `${value?.name ?? ""} ${value?.message ?? String(error ?? "")}`;
  if (/ChunkLoadError|Loading chunk|dynamically imported module|module script failed/i.test(text)) {
    return "stale_chunk";
  }
  if (/hydration|hydrating/i.test(text)) return "hydration";
  if (/AbortError/i.test(text)) return "abort";
  if (/Failed to fetch|NetworkError|Load failed/i.test(text)) return "network";
  return "unknown";
}

export function reportClientError(
  kind: ClientErrorKind,
  error: unknown,
  details: { digest?: string; filename?: string; line?: number; column?: number } = {},
): void {
  const value = error as { name?: string; requestId?: string } | null;
  let asset: string | undefined;
  if (details.filename) {
    try {
      asset = new URL(details.filename, window.location.origin).pathname.split("/").pop();
    } catch {
      asset = undefined;
    }
  }
  trackOperationalEvent("client_error", {
    kind,
    classification: classifyClientError(error),
    error_name: value?.name ?? typeof error,
    request_id: value?.requestId,
    digest: details.digest,
    asset,
    line: details.line,
    column: details.column,
  });
}
