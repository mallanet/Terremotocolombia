import {
  type ContractMismatchEvent,
  getContractValidationMode,
  readContract,
  validateContract,
} from "@mallanet/contracts";
import type { z } from "zod";
import { trackOperationalEvent } from "@/lib/openpanel";

export function reportContractMismatch(event: ContractMismatchEvent): void {
  trackOperationalEvent("client_error", {
    kind: "contract",
    classification: "contract_mismatch",
    endpoint: event.endpoint,
    issue_paths: event.issuePaths.slice(0, 20),
  });
}

export function validateApiContract<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  endpoint: string,
) {
  return validateContract(schema, raw, {
    endpoint,
    onMismatch: reportContractMismatch,
  });
}

export function readApiContract<T, Adapted>(
  schema: z.ZodType<T>,
  raw: unknown,
  endpoint: string,
  adapt: (raw: unknown) => Adapted,
): T | Adapted {
  return readContract(schema, raw, {
    endpoint,
    mode: getContractValidationMode(),
    onMismatch: reportContractMismatch,
    adapt,
  });
}
