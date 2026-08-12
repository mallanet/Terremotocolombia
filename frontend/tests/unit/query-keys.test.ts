import { describe, it, expect } from "vitest";
import { qk } from "@/lib/query-keys";

// La dedup/invalidación de TanStack depende de igualdad de queryKey. Estos tests
// fijan la forma de las claves: dos llamadas con el mismo input → clave igual.

describe("qk (queryKeys)", () => {
  it("expone claves de prefijo estables", () => {
    expect(qk.reports.all).toEqual(["reports"]);
    expect(qk.missing.stats).toEqual(["missing", "stats"]);
    expect(qk.hospitals.all).toEqual(["hospitals"]);
    expect(qk.needs.all).toEqual(["needs"]);
  });

  it("needs.publication separa el seguimiento por job", () => {
    expect(qk.needs.publication("need-demo-1")).toEqual([
      "needs",
      "publication",
      "need-demo-1",
    ]);
  });

  it("missing.list incrusta los params y es igual para inputs iguales", () => {
    const a = qk.missing.list({ status: "active", page: 1, pageSize: 20 });
    const b = qk.missing.list({ status: "active", page: 1, pageSize: 20 });
    expect(a).toEqual(b);
    expect(a).toEqual(["missing", "list", { status: "active", page: 1, pageSize: 20 }]);
  });

  it("hospitals.patients/supplies se parametrizan por id", () => {
    expect(qk.hospitals.patients("DEMO-hosp-3")).toEqual([
      "hospitals",
      "DEMO-hosp-3",
      "patients",
    ]);
    expect(qk.hospitals.supplies("DEMO-hosp-3")).toEqual([
      "hospitals",
      "DEMO-hosp-3",
      "supplies",
    ]);
  });

  it("missing.map admite null (sin bounds)", () => {
    expect(qk.missing.map(null)).toEqual(["missing", "map", null]);
  });

  // Mascotas: dominio SEPARADO de personas. Que los prefijos no se solapen es lo
  // que garantiza que invalidar mascotas tras publicar un reporte no dispare un
  // refetch del directorio de personas (ni al revés).
  it("pets vive bajo su propio prefijo, disjunto del de missing", () => {
    expect(qk.pets.all).toEqual(["pets"]);
    expect(qk.pets.stats).toEqual(["pets", "stats"]);
    expect(qk.pets.map(null)).toEqual(["pets", "map", null]);
    expect(qk.pets.all[0]).not.toBe(qk.missing.all[0]);
  });

  it("pets.list incrusta los params (incluida la especie) y es estable", () => {
    const params = {
      status: "active" as const,
      page: 1,
      pageSize: 8,
      species: "perro",
    };
    expect(qk.pets.list(params)).toEqual(qk.pets.list({ ...params }));
    expect(qk.pets.list(params)).toEqual(["pets", "list", params]);
  });
});
