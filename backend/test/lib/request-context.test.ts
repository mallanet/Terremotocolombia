import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import "../helpers";

describe("request correlation", () => {
  it("returns a service-generated request ID", async () => {
    const { app } = await import("@/server");
    const response = await request(app)
      .get("/api/healthz")
      .set("X-Request-Id", "client-controlled");
    expect(response.status).toBe(200);
    expect(response.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(response.headers["x-request-id"]).not.toBe("client-controlled");
  });

  it("keeps database telemetry scoped to one asynchronous request", async () => {
    const { databaseTelemetry, recordDatabaseCall, requestContext } = await import(
      "@/lib/request-context"
    );
    const scopedApp = express();
    scopedApp.use(requestContext);
    scopedApp.get("/telemetry", async (_req, res) => {
      await Promise.resolve();
      recordDatabaseCall({ durationMs: 12.5, retries: 1, failed: false });
      res.json(databaseTelemetry());
    });

    const response = await request(scopedApp).get("/telemetry");
    expect(response.body).toEqual({
      dbQueries: 2,
      dbDurationMs: 12.5,
      dbRetries: 1,
      dbFailures: 0,
    });
    expect(databaseTelemetry()).toEqual({
      dbQueries: 0,
      dbDurationMs: 0,
      dbRetries: 0,
      dbFailures: 0,
    });
  });
});
