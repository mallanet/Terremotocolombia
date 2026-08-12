import { beforeAll, describe, expect, it } from "vitest";
import "../helpers";
import request from "supertest";

let app: import("express").Express;

beforeAll(async () => {
  app = (await import("@/server")).app;
});

describe("POST /api/reports type=need", () => {
  it("persiste un pedido de ayuda y lo devuelve en el listado", async () => {
    const place = `DEMO-pedido-ayuda-${Math.trunc(performance.now())}`;
    const created = await request(app)
      .post("/api/reports")
      .send({
        type: "need",
        lat: 10.5,
        lng: -66.9,
        place,
        affected: 4,
        needs: "DEMO-Agua potable y cobijas",
      });

    expect(created.status).toBe(201);
    expect(created.body.report).toMatchObject({
      type: "need",
      place,
      affected: 4,
      needs: "DEMO-Agua potable y cobijas",
    });
    expect(created.body.report).not.toHaveProperty("photo");

    const listed = await request(app).get("/api/reports");
    expect(listed.status).toBe(200);
    const found = listed.body.reports.find(
      (row: { id: string }) => row.id === created.body.report.id,
    );
    expect(found).toMatchObject({ type: "need", place });
  });

  it("rechaza un tipo desconocido y no lo guarda como pedido", async () => {
    const res = await request(app)
      .post("/api/reports")
      .send({
        type: "pedido",
        lat: 10.5,
        lng: -66.9,
        place: "DEMO-tipo-invalido",
      });
    expect(res.status).toBe(400);
  });
});
