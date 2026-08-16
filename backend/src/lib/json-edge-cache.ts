import type { EdgeCache } from "@/lib/photo-edge-cache";

const PUBLIC_JSON_PATH =
  /^\/api\/(?:missing|deceased|pets|reports|chat|hospitals|earthquakes|donations|patients|acopio|hub)(?:\/.*)?$|^\/api\/stats\/psychology-help\/?$/;
const EDGE_CACHE_LOG_SAMPLE_RATE = 0.01;

type EdgeCacheOutcome = "hit" | "miss_fill" | "miss_uncacheable";

function logCacheOutcome(request: Request, outcome: EdgeCacheOutcome, status: number): void {
  if (Math.random() >= EDGE_CACHE_LOG_SAMPLE_RATE) return;
  // Family is a bounded allowlist value such as `reports` or `missing`. Never
  // log the URL, query string, cache key, Origin, or a dynamic record ID.
  const family = new URL(request.url).pathname.split("/")[2] ?? "unknown";
  console.log({ t: "edge_cache", cache: "json", family, outcome, status });
}

export function isCacheablePublicJsonPath(pathname: string): boolean {
  return PUBLIC_JSON_PATH.test(pathname) && !pathname.endsWith("/photo") &&
    !pathname.endsWith("/resolution-photo");
}

function cacheKey(request: Request): Request {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  // Cache API keys are URL-based. Partition reflected CORS responses by the
  // allowlisted Origin so one site's ACAO header cannot be served to another.
  url.searchParams.set("__edge_origin", origin ?? "none");
  return new Request(url, { method: "GET" });
}

function isPublicCacheResponse(response: Response): boolean {
  const control = response.headers.get("cache-control") ?? "";
  return response.status === 200 &&
    /(?:^|,)\s*public\b/i.test(control) &&
    /(?:^|,)\s*s-maxage=\d+/i.test(control) &&
    !response.headers.has("set-cookie");
}

export async function servePublicJsonCached(opts: {
  request: Request;
  cache: EdgeCache;
  fetchOrigin: () => Promise<Response>;
  waitUntil: (p: Promise<unknown>) => void;
}): Promise<Response> {
  // Authenticated requests never share a public cache entry, even when they
  // happen to target a public path.
  if (opts.request.headers.has("authorization") || opts.request.headers.has("cookie")) {
    return opts.fetchOrigin();
  }

  const key = cacheKey(opts.request);
  const cached = await opts.cache.match(key);
  if (cached) {
    const response = new Response(cached.body, cached);
    response.headers.set("x-json-edge-cache", "hit");
    logCacheOutcome(opts.request, "hit", response.status);
    return response;
  }

  const fresh = await opts.fetchOrigin();
  const cacheable = isPublicCacheResponse(fresh);
  if (cacheable) {
    opts.waitUntil(opts.cache.put(key, fresh.clone()));
  }
  const response = new Response(fresh.body, fresh);
  response.headers.set("x-json-edge-cache", "miss");
  logCacheOutcome(opts.request, cacheable ? "miss_fill" : "miss_uncacheable", response.status);
  return response;
}
