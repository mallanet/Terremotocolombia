export type VolunteerCodeDbMocks = {
  volunteers: Array<Record<string, unknown>>;
  checkins: Array<Record<string, unknown>>;
  reports: Array<Record<string, unknown>>;
  volunteerInsertErrors?: unknown[];
  selectCalls?: number;
};

type DbModule = typeof import("@/db");

export function volunteerCodeDbMock(
  actual: DbModule,
  dbMocks: VolunteerCodeDbMocks,
): DbModule {
  function rowsFor(table: unknown): Array<Record<string, unknown>> {
    if (table === actual.schema.volunteers) return dbMocks.volunteers;
    if (table === actual.schema.volunteerCheckins) return dbMocks.checkins;
    if (table === actual.schema.reports) return dbMocks.reports;
    return [];
  }

  function chain() {
    let rows: Array<Record<string, unknown>> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cadena fluida de Drizzle en tests
    const c: any = {
      from: (table: unknown) => {
        rows = rowsFor(table);
        return c;
      },
      innerJoin: () => c,
      where: () => c,
      orderBy: () => c,
      limit: () => c,
      then: (resolve: (v: Array<Record<string, unknown>>) => void) => resolve(rows),
    };
    return c;
  }

  function insertValues(table: unknown, row: Record<string, unknown>) {
    if (table === actual.schema.volunteers && dbMocks.volunteerInsertErrors?.length) {
      return Promise.reject(dbMocks.volunteerInsertErrors.shift());
    }
    rowsFor(table).push(row);
    return Promise.resolve();
  }

  function applyUpdate(table: unknown, values: Record<string, unknown>) {
    const rows = rowsFor(table);
    if (rows[0]) Object.assign(rows[0], values);
    return Promise.resolve();
  }

  function makeInsert(table: unknown) {
    return { values: (row: Record<string, unknown>) => insertValues(table, row) };
  }

  function makeUpdate(table: unknown) {
    return {
      set(values: Record<string, unknown>) {
        return { where: () => applyUpdate(table, values) };
      },
    };
  }

  return {
    ...actual,
    getDb: () => ({
      select: () => {
        dbMocks.selectCalls = (dbMocks.selectCalls ?? 0) + 1;
        return chain();
      },
      insert: makeInsert,
      update: makeUpdate,
    }),
  } as DbModule;
}
