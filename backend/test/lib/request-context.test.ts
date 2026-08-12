import { describe, expect, it } from "vitest";
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
});
