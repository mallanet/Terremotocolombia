import { describe, expect, it } from "vitest";
import {
  RESCUE_OFFLINE_BUDGET_BYTES,
  byteLength,
  isOfflinePackageStale,
  isQuotaError,
  rescuePackageCapacityIssue,
  type RescueMapOfflinePackage,
} from "@/lib/rescue-map-offline";
import type { RescueMapMappingSnapshot } from "@/lib/rescue-map";

describe("rescue map offline budget", () => {
  it("mide bytes UTF-8 del paquete de datos", () => {
    expect(byteLength({ area: "Chocó" })).toBeGreaterThan(
      JSON.stringify({ area: "Choco" }).length,
    );
  });

  it("rechaza paquetes que superarían el presupuesto de 8 MB", () => {
    expect(
      rescuePackageCapacityIssue({
        existingBytes: RESCUE_OFFLINE_BUDGET_BYTES - 100,
        replacedBytes: 0,
        packageBytes: 101,
        availableDeviceBytes: 1024,
      }),
    ).toBe("budget");
  });

  it("permite reemplazar una versión anterior sin contarla dos veces", () => {
    expect(
      rescuePackageCapacityIssue({
        existingBytes: RESCUE_OFFLINE_BUDGET_BYTES,
        replacedBytes: 2048,
        packageBytes: 1024,
        availableDeviceBytes: 4096,
      }),
    ).toBeNull();
  });

  it("detecta almacenamiento del dispositivo lleno", () => {
    expect(
      rescuePackageCapacityIssue({
        existingBytes: 0,
        replacedBytes: 0,
        packageBytes: 2048,
        availableDeviceBytes: 1024,
      }),
    ).toBe("quota");
  });
});

describe("rescue map offline state", () => {
  it("marca un paquete obsoleto si cambió la fuente oficial", () => {
    const item = {
      sourceUpdatedAt: "2026-08-11T11:38:48Z",
    } as RescueMapOfflinePackage;
    const mapping = {
      lastCheckedAt: "2026-08-12T09:00:00Z",
    } as RescueMapMappingSnapshot;
    expect(isOfflinePackageStale(item, mapping)).toBe(true);
  });

  it("reconoce errores de cuota del navegador", () => {
    expect(isQuotaError(new DOMException("full", "QuotaExceededError"))).toBe(
      true,
    );
    expect(isQuotaError(new Error("full"))).toBe(false);
  });
});
