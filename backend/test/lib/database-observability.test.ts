import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../helpers";
import { metricsMiddleware } from "@/lib/metrics";
import { recordDatabaseCall, requestContext } from "@/lib/request-context";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("database observability", () => {
  it("keeps slow database telemetry in the structured access record", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const app = express();
    app.use(requestContext);
    app.use(metricsMiddleware);
    app.get("/items/:id", async (_req, res) => {
      await Promise.resolve();
      recordDatabaseCall({ durationMs: 300, retries: 1, failed: false });
      res.json({ ok: true });
    });

    const response = await request(app).get("/items/example-id");
    expect(response.status).toBe(200);

    const access = log.mock.calls
      .map(([entry]) => entry)
      .find((entry) => typeof entry === "object" && entry !== null && entry.t === "access");
    expect(access).toMatchObject({
      route: "/items/:id",
      status: 200,
      db_queries: 2,
      db_ms: 300,
      db_retries: 1,
      db_failures: 0,
    });
    expect(access).not.toHaveProperty("sql");
    expect(access).not.toHaveProperty("params");
  });
});
