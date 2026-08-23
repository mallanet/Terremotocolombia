/**
 * In-process cache for hot public GETs. Each isolate keeps its own Map.
 *
 * U20 / KTD12: every tenant-derived entry is stored under an explicit
 * partition (organization + incident + cache epoch). Global catalogs
 * (earthquakes) use GLOBAL_PROCESS_CACHE. Callers pass ProcessCache;
 * AsyncLocalStorage is not used (KTD13).
 *
 * Search/filter values must go through cacheParamDigest before they enter
 * a key. invalidate() without a key clears one partition, never the whole Map.
 */

import { createHash } from "node:crypto";
import type { TenantScope } from "@/tenant/scope";
import { tenantCachePartition } from "@/tenant/scope";

type Entry<T> = { at: number; value: T };

/** Cap keys to bound memory on parameterized endpoints (simple LRU). */
const MAX_ENTRIES = 500;

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export type ProcessCache = {
  readonly partition: string;
};

export const GLOBAL_PROCESS_CACHE: ProcessCache = Object.freeze({
  partition: "g",
});

export function tenantProcessCache(scope: TenantScope): ProcessCache {
  return Object.freeze({ partition: `t:${tenantCachePartition(scope)}` });
}

export function cacheParamDigest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function fullKey(cache: ProcessCache, key: string): string {
  return `${cache.partition}:${key}`;
}

/**
 * Return the cached value for `key` if it is fresh; otherwise recompute with
 * `fn`. Serve a stale value (when present) while refresh runs in the background.
 */
export async function cached<T>(
  cache: ProcessCache,
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const storeKey = fullKey(cache, key);
  const hit = store.get(storeKey) as Entry<T> | undefined;
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;

  let p = inflight.get(storeKey) as Promise<T> | undefined;
  if (!p) {
    p = fn()
      .then((value) => {
        store.set(storeKey, { at: Date.now(), value });
        if (store.size > MAX_ENTRIES) {
          const oldest = store.keys().next().value;
          if (oldest !== undefined) store.delete(oldest);
        }
        return value;
      })
      .finally(() => {
        inflight.delete(storeKey);
      });
    inflight.set(storeKey, p);
  }

  if (hit) {
    p.catch(() => {});
    return hit.value;
  }
  return p;
}

/** Invalidate one key, or every key in this partition. */
export function invalidate(cache: ProcessCache, key?: string): void {
  if (key !== undefined) {
    store.delete(fullKey(cache, key));
    return;
  }
  const prefix = `${cache.partition}:`;
  for (const storeKey of store.keys()) {
    if (storeKey.startsWith(prefix)) store.delete(storeKey);
  }
}
