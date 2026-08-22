import {
  type ContractMismatchEvent,
  getContractValidationMode,
  readContract,
  validateContract,
} from "@mallanet/contracts";
import type { z } from "zod";
import type { Result } from "../result";
import { err, ok } from "../result";

export type ContractMismatchReporter = (event: ContractMismatchEvent) => void;

let reporter: ContractMismatchReporter = () => undefined;

export function setContractMismatchReporter(next: ContractMismatchReporter): void {
  reporter = next;
}

export function reportAdminContractMismatch(event: ContractMismatchEvent): void {
  reporter(event);
}

export function validateAdminContract<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  endpoint: string,
) {
  return validateContract(schema, raw, {
    endpoint,
    onMismatch: reportAdminContractMismatch,
  });
}

export function readAdminContract<T, Adapted>(
  schema: z.ZodType<T>,
  raw: unknown,
  endpoint: string,
  adapt: (raw: unknown) => Adapted,
): T | Adapted {
  return readContract(schema, raw, {
    endpoint,
    mode: getContractValidationMode(),
    onMismatch: reportAdminContractMismatch,
    adapt,
  });
}

/**
 * Result wrapper for admin. Never throws. Invalid JSON does not become type T.
 * Enforce (dev/test) and report both return Err so the BFF keeps its Result
 * idiom. Use `readAdminContract` plus an adapter when a UI must keep rendering.
 */
export function readAdminResult<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  endpoint: string,
): Result<T> {
  const result = validateAdminContract(schema, raw, endpoint);
  if (result.valid) return ok(result.data);
  return err({
    kind: "parse",
    message: `contract mismatch at ${endpoint}`,
  });
}
