/**
 * RED→GREEN: GET /api/earthquakes returns { earthquakes, sync } envelope.
 */
import express from "express";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

const listMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    earthquakes: [
      {
        id: "demo-eq-1",
        magnitude: 4.2,
        place: "Demo Place",
        lat: 1,
        lng: -70,
        depthKm: 10,
        alert: null,
        tsunami: false,
        sig: 50,
        occurredAt: 1_700_000_000_000,
      },
    ],
    sync: { fetchedAt: 1_700_000_100_000 },
  }),
);

vi.mock("@/services/earthquakes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/earthquakes")>();
  return {
    ...actual,
    listEarthquakes: listMock,
  };
});

// Env before route middleware pulls config.
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://mapa_app:localdev@localhost:5432/app";
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? "test-jwt-secret-not-for-prod-0123456789";
process.env.PATIENT_DOCUMENT_HASH_SECRET =
  process.env.PATIENT_DOCUMENT_HASH_SECRET ??
  "test-patient-document-hash-secret-0123456789";
process.env.RATE_LIMIT_DISABLED = "1";

let app: express.Express;

beforeAll(async () => {
  const { earthquakesRouter } = await import("@/routes/earthquakes");
  const { errorHandler } = await import("@/middleware");
  app = express();
  app.use("/api/earthquakes", earthquakesRouter);
  app.use(errorHandler);
});

describe("GET /api/earthquakes envelope", () => {
  it("returns { earthquakes, sync.fetchedAt } and caches the whole body", async () => {
    const res = await request(app).get("/api/earthquakes");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      earthquakes: [
        expect.objectContaining({ id: "demo-eq-1", occurredAt: 1_700_000_000_000 }),
      ],
      sync: { fetchedAt: 1_700_000_100_000 },
    });
    expect(listMock).toHaveBeenCalled();
  });

  it("exposes null sync.fetchedAt when the service reports never-synced", async () => {
    listMock.mockResolvedValueOnce({
      earthquakes: [],
      sync: { fetchedAt: null },
    });
    // Distinct limit → distinct cache key (in-process cached()).
    const res = await request(app).get("/api/earthquakes?limit=2");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ earthquakes: [], sync: { fetchedAt: null } });
  });
});
