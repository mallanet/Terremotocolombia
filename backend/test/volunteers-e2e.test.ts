// E2E del pipeline de voluntarios contra Postgres REAL (mismo harness que
// authz-matrix): lo que envía el formulario público debe aparecer en la
// bandeja del panel con su origen — es la prueba de "la tabla se llena".
import "./helpers";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { ensureSeed, makeAdmin } from "./helpers";

let app: import("express").Express;
let adminToken: string;

beforeAll(async () => {
  await ensureSeed();
  app = (await import("@/server")).app;
  adminToken = (await makeAdmin()).token;
});

describe("volunteers E2E: formulario público → bandeja del panel", () => {
  it("un registro de /api/volunteers aparece en /api/public/volunteers con su origen", async () => {
    const create = await request(app)
      .post("/api/volunteers")
      .send({
        name: "DEMO-E2E Voluntaria",
        contact: "demo-e2e@example.org",
        zone: "DEMO-Pereira, Colombia",
        availability: "DEMO-nocturno",
        offerTypes: ["persona"],
        digitalSkills: ["Verificación de datos"],
        source: "utm:e2e/test/pipeline",
      });
    expect(create.status).toBe(200);
    expect(create.body.ok).toBe(true);

    const list = await request(app)
      .get("/api/public/volunteers")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(list.status).toBe(200);

    const rows = (list.body.items ?? list.body) as Array<Record<string, unknown>>;
    const found = rows.find((r) => r.id === create.body.id);
    expect(found).toBeDefined();
    expect(found).toMatchObject({
      name: "DEMO-E2E Voluntaria",
      source: "utm:e2e/test/pipeline",
      status: "pending",
    });
    // La bandeja NUNCA expone el hash de IP.
    expect(found).not.toHaveProperty("ipHash");
  });
});
