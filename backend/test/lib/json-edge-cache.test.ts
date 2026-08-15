import { describe, expect, it } from "vitest";
import {
  isCacheablePublicJsonPath,
  servePublicJsonCached,
} from "@/lib/json-edge-cache";
import type { EdgeCache } from "@/lib/photo-edge-cache";

function fakeCache(initial?: Response) {
  let stored = initial;
  let puts = 0;
  const keys: string[] = [];
  const cache: EdgeCache = {
	async match(key) {
	  keys.push(key.url);
      return stored;
    },
    async put(_key, response) {
      puts++;
      stored = response;
    },
  };
  return { cache, putCount: () => puts, keys };
}

describe("public JSON edge cache", () => {
  it("allows hot public reads and rejects private/large binary paths", () => {
    expect(isCacheablePublicJsonPath("/api/missing/stats")).toBe(true);
    expect(isCacheablePublicJsonPath("/api/deceased")).toBe(true);
    expect(isCacheablePublicJsonPath("/api/hospitals/demo/supply")).toBe(true);
    expect(isCacheablePublicJsonPath("/api/public/users")).toBe(false);
    expect(isCacheablePublicJsonPath("/api/geocode")).toBe(false);
    expect(isCacheablePublicJsonPath("/api/missing/demo/photo")).toBe(false);
  });

  it("stores only a successful explicitly public response", async () => {
    const { cache, putCount } = fakeCache();
    const pending: Promise<unknown>[] = [];
    const response = await servePublicJsonCached({
      request: new Request("https://api.example.org/api/missing/stats"),
      cache,
      fetchOrigin: async () => new Response("{}", {
        headers: { "Cache-Control": "public, max-age=0, s-maxage=5" },
      }),
      waitUntil: (promise) => pending.push(promise),
    });
    await Promise.all(pending);
    expect(response.headers.get("x-json-edge-cache")).toBe("miss");
    expect(putCount()).toBe(1);
  });

  it("serves a hit without calling Express", async () => {
    const { cache } = fakeCache(new Response('{"cached":true}', {
      headers: { "Cache-Control": "public, s-maxage=5" },
    }));
    let originCalls = 0;
    const response = await servePublicJsonCached({
      request: new Request("https://api.example.org/api/missing/stats"),
      cache,
      fetchOrigin: async () => {
        originCalls++;
        return new Response("{}");
      },
      waitUntil: () => {},
    });
    expect(originCalls).toBe(0);
    expect(response.headers.get("x-json-edge-cache")).toBe("hit");
    expect(await response.json()).toEqual({ cached: true });
  });

  it("partitions reflected CORS responses by Origin", async () => {
	const { cache, keys } = fakeCache();
	await servePublicJsonCached({
	  request: new Request("https://api.example.org/api/missing", {
		headers: { Origin: "https://web.example.org" },
	  }),
	  cache,
	  fetchOrigin: async () => new Response("{}"),
	  waitUntil: () => {},
	});
	expect(new URL(keys[0]!).searchParams.get("__edge_origin")).toBe(
	  "https://web.example.org",
	);
  });

  it("bypasses cache for authenticated requests and private responses", async () => {
    for (const request of [
      new Request("https://api.example.org/api/missing", { headers: { Cookie: "session=x" } }),
      new Request("https://api.example.org/api/missing", { headers: { Authorization: "Bearer x" } }),
    ]) {
      const { cache, putCount } = fakeCache(new Response("cached"));
      const response = await servePublicJsonCached({
        request,
        cache,
        fetchOrigin: async () => new Response("private", {
          headers: { "Cache-Control": "private, no-store" },
        }),
        waitUntil: () => {},
      });
      expect(await response.text()).toBe("private");
      expect(putCount()).toBe(0);
    }
  });
});
