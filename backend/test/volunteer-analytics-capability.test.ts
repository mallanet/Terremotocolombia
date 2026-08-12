/**
 * RBAC — volunteer:read for analytics board.
 *
 * Staging already exposes `volunteer:read` via MODELS CRUD (`volunteer`).
 * Analytics MUST reuse that key (no duplicate CROSS_CUTTING entry).
 */
import { beforeAll, describe, expect, it } from "vitest";
import "./helpers";
import { ensureSeed, makeAdmin, makeUserWithCaps } from "./helpers";
import { eq, and } from "drizzle-orm";

describe("volunteer:read capability catalog (unit)", () => {
  it("is present from volunteer MODEL CRUD (analytics reuses it)", async () => {
    const { CAPABILITIES, MODELS, isKnownCapability, CROSS_CUTTING } = await import(
      "@/auth/capabilities"
    );
    expect(MODELS.some((m) => m.key === "volunteer")).toBe(true);
    expect(isKnownCapability("volunteer:read")).toBe(true);
    const entry = CAPABILITIES.find((c) => c.key === "volunteer:read");
    expect(entry).toEqual(
      expect.objectContaining({
        key: "volunteer:read",
        category: "volunteers",
      }),
    );
    // No duplicate CROSS_CUTTING key — Set would collapse, but seed/catalog
    // length must stay unique per key.
    expect(CROSS_CUTTING.some((c) => c.key === "volunteer:read")).toBe(false);
    expect(CAPABILITIES.filter((c) => c.key === "volunteer:read")).toHaveLength(1);
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
