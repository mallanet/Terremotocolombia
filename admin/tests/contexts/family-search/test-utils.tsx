import type { ReactNode } from "react";
import { renderWithProviders } from "@/tests/_utils/render-with-providers";
import { AdminSessionContext } from "@/src/shared/auth/admin-session-context";
import type {
  QueueItemDTO,
  DecisionHistoryEntryDTO,
  RecordDisplayDTO,
} from "@/src/contexts/family-search/types";

/** Mismo patrón que `patient-import-row-editor.test.tsx` (U5) — sesión de
 *  prueba con capacidades explícitas. Por defecto trae las TRES capacidades
 *  del contexto (person:search/review/merge); los tests de gating las
 *  reducen a mano. */
export function withSession(
  ui: ReactNode,
  capabilities: string[] = ["person:search", "person:review", "person:merge"],
) {
  return renderWithProviders(
    <AdminSessionContext.Provider
      value={{
        user: { id: "u1", email: "demo@example.test", roleId: null, orgId: null, isAdmin: false },
        capabilities,
        isLoading: false,
        sessionCheckFailed: false,
        retrySessionCheck: () => {},
        login: async () => {},
        logout: async () => {},
        can: (capability) => capabilities.includes(capability),
      }}
    >
      {ui}
    </AdminSessionContext.Provider>,
  );
}

/** DTOs de fixture — SIEMPRE nombres estilo DEMO, nunca datos reales. Los PRN
 *  son solo strings de display en estos tests (nunca pasan por
 *  `normalizePrn`/`looksLikePrn` salvo en search-panel.test.tsx, donde se
 *  usan formas realistas a propósito). */
export const DEMO_RECORD_A: RecordDisplayDTO = {
  prn: "TC-DEMO0001X",
  recordType: "missing_report",
  name: "Demo Uno",
  age: 30,
  population: "missing_report",
  source: "Cruz Roja Demo",
  outcome: null as null,
  clusterId: null as string | null,
};

export const DEMO_RECORD_B: RecordDisplayDTO = {
  prn: "TC-DEMO0002Y",
  recordType: "hospital_patient",
  name: "Demo Dos",
  age: 31,
  population: "hospital_patient",
  source: "Hospital Demo",
  outcome: null as null,
  clusterId: null as string | null,
};

export function buildQueueItem(overrides: {
  link?: Partial<typeof baseLink>;
  a?: typeof DEMO_RECORD_A | null;
  b?: typeof DEMO_RECORD_B | null;
  priorRejection?: DecisionHistoryEntryDTO | null;
} = {}): QueueItemDTO {
  return {
    link: { ...baseLink, ...overrides.link },
    a: overrides.a === undefined ? DEMO_RECORD_A : overrides.a,
    b: overrides.b === undefined ? DEMO_RECORD_B : overrides.b,
    priorRejection: overrides.priorRejection ?? null,
  };
}

const baseLink = {
  id: "link-1",
  prnA: "TC-DEMO0001X",
  prnB: "TC-DEMO0002Y",
  status: "proposed",
  score: 0.75,
  evidence: { nombre: "exact", edad: "exact" } as Record<string, string>,
  evidenceClass: "name_age_exact",
  method: "deterministic",
  matcherVersion: "det-1",
  proposedAt: 1000,
};
