import { beforeEach, describe, expect, it } from "vitest";
import {
  GLOBAL_PROCESS_CACHE,
  cacheParamDigest,
  cached,
  invalidate,
  tenantProcessCache,
} from "@/lib/cache";
import { createTenantScope } from "@/tenant/scope";

const tenantA = tenantProcessCache(
  createTenantScope({
    organizationId: "org_a",
    incidentId: "inc_a",
    hostname: "a.example.org",
  }),
);

const tenantB = tenantProcessCache(
  createTenantScope({
    organizationId: "org_b",
    incidentId: "inc_b",
    hostname: "b.example.org",
  }),
);

describe("process cache partitions", () => {
  beforeEach(() => {
    invalidate(tenantA);
    invalidate(tenantB);
    invalidate(GLOBAL_PROCESS_CACHE);
  });

  it("does not serve tenant A's value to tenant B", async () => {
    let loads = 0;
    await cached(tenantA, "reports:all", 60_000, async () => {
      loads += 1;
      return "a";
    });
    const b = await cached(tenantB, "reports:all", 60_000, async () => {
      loads += 1;
      return "b";
    });
    expect(b).toBe("b");
    expect(loads).toBe(2);
  });

  it("keeps a hit inside the same tenant", async () => {
    let loads = 0;
    const first = await cached(tenantA, "pets:stats", 60_000, async () => {
      loads += 1;
      return 1;
    });
    const second = await cached(tenantA, "pets:stats", 60_000, async () => {
      loads += 1;
      return 2;
    });
    expect(first).toBe(1);
    expect(second).toBe(1);
    expect(loads).toBe(1);
  });

  it("clears only the named partition", async () => {
    await cached(tenantA, "k", 60_000, async () => "a");
    await cached(tenantB, "k", 60_000, async () => "b");
    invalidate(tenantA);
    const a = await cached(tenantA, "k", 60_000, async () => "a2");
    const b = await cached(tenantB, "k", 60_000, async () => "b2");
    expect(a).toBe("a2");
    expect(b).toBe("b");
  });

  it("keeps the global catalog off tenant partitions", async () => {
    await cached(GLOBAL_PROCESS_CACHE, "earthquakes:100", 60_000, async () => "g");
    invalidate(tenantA);
    const g = await cached(GLOBAL_PROCESS_CACHE, "earthquakes:100", 60_000, async () => "g2");
    expect(g).toBe("g");
  });

  it("hashes filter values so raw search text is not the Map key", () => {
    const digest = cacheParamDigest("nombre real");
    expect(digest).toHaveLength(16);
    expect(digest).not.toContain("nombre");
    expect(cacheParamDigest("nombre real")).toBe(digest);
    expect(cacheParamDigest("otro")).not.toBe(digest);
  });
});
