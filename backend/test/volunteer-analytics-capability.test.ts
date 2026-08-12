/**
 * RBAC-1/2/3 — volunteer:read capability foundation (WU1).
 *
 * Analytics HTTP 403 lands with the router in a later work unit; here we lock
 * the catalog + seedAuth auto-grant path that WU2/WU3 will rely on.
 */
import { beforeAll, describe, expect, it } from "vitest";
import "./helpers";
import { ensureSeed, makeAdmin, makeUserWithCaps } from "./helpers";
import { eq, and } from "drizzle-orm";

describe("volunteer:read capability catalog (unit)", () => {
  it("is present in CAPABILITIES as CROSS_CUTTING volunteers category", async () => {
    const { CAPABILITIES, isKnownCapability } = await import("@/auth/capabilities");
    expect(isKnownCapability("volunteer:read")).toBe(true);
    const entry = CAPABILITIES.find((c) => c.key === "volunteer:read");
    expect(entry).toEqual(
      expect.objectContaining({
        key: "volunteer:read",
        category: "volunteers",
        description: expect.stringMatching(/anal[ií]tica|voluntar/i),
      }),
    );
  });

  it("is not a CRUD model capability (MODELS stays free of volunteer)", async () => {
    const { MODELS } = await import("@/auth/capabilities");
    expect(MODELS.some((m) => m.key === "volunteer")).toBe(false);
  });
});

describe("volunteer:read seed AuthZ (integration)", () => {
  beforeAll(async () => {
    await ensureSeed();
  });

  it("system admin role is linked to volunteer:read after seedAuth (RBAC-2)", async () => {
    const { getDb, schema } = await import("@/db");
    const { SYSTEM_ADMIN_ROLE } = await import("@/auth/capabilities");
    const db = getDb();
    const adminRole = await db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.name, SYSTEM_ADMIN_ROLE), eq(schema.roles.isSystem, true)))
      .limit(1);
    expect(adminRole[0]).toBeTruthy();
    const link = await db
      .select({ k: schema.roleCapabilities.capabilityKey })
      .from(schema.roleCapabilities)
      .where(
        and(
          eq(schema.roleCapabilities.roleId, adminRole[0]!.id),
          eq(schema.roleCapabilities.capabilityKey, "volunteer:read"),
        ),
      )
      .limit(1);
    expect(link).toHaveLength(1);
    expect(link[0]!.k).toBe("volunteer:read");
  });

  it("system admin session resolves volunteer:read via userHasCapability", async () => {
    const admin = await makeAdmin();
    const { loadAuthUser, userHasCapability } = await import("@/auth/resolve");
    const user = await loadAuthUser(admin.id);
    expect(user).toBeTruthy();
    expect(await userHasCapability(user!, "volunteer:read")).toBe(true);
  });

  it("non-admin role without grant does NOT get volunteer:read (RBAC-3)", async () => {
    const { getDb, schema } = await import("@/db");
    const { userHasCapability, loadAuthUser } = await import("@/auth/resolve");
    // Role with an unrelated cap only — seed must not inject volunteer:read.
    const { id, roleId } = await makeUserWithCaps(["report:read"]);
    expect(roleId).toBeTruthy();
    const injected = await getDb()
      .select({ k: schema.roleCapabilities.capabilityKey })
      .from(schema.roleCapabilities)
      .where(
        and(
          eq(schema.roleCapabilities.roleId, roleId!),
          eq(schema.roleCapabilities.capabilityKey, "volunteer:read"),
        ),
      );
    expect(injected).toEqual([]);
    const user = await loadAuthUser(id);
    expect(user).toBeTruthy();
    expect(await userHasCapability(user!, "volunteer:read")).toBe(false);
  });
});
