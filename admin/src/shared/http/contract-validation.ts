import {
  type ContractMismatchEvent,
  getContractValidationMode,
  readContract,
  validateContract,
} from "@mallanet/contracts";
import type { z } from "zod";

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
