import type { z } from "zod";

export type ContractValidationMode = "report" | "enforce";

type EnvMap = Record<string, string | undefined>;

export type ContractValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; raw: unknown; issues: string[] };

export type ContractMismatchEvent = {
  endpoint: string;
  issuePaths: string[];
};

export type ContractValidationOptions = {
  endpoint: string;
  mode?: ContractValidationMode;
  onMismatch?: (event: ContractMismatchEvent) => void;
};

function readEnv(): EnvMap {
  const runtime = globalThis as { process?: { env?: EnvMap } };
  return runtime.process?.env ?? {};
}

function nodeEnv(env: EnvMap): string | undefined {
  return env.NODE_ENV;
}

/**
 * Production defaults to report mode. Development and test always enforce.
 * An explicit `enforce` flag can turn production hard-fail on after burn-in.
 */
export function getContractValidationMode(env: EnvMap = readEnv()): ContractValidationMode {
  const runtime = nodeEnv(env);
  if (runtime === "development" || runtime === "test") return "enforce";
  const flag =
    env.NEXT_PUBLIC_CONTRACT_VALIDATION_MODE ?? env.CONTRACT_VALIDATION_MODE;
  if (flag === "enforce") return "enforce";
  return "report";
}

export function issuePathsFromZod(error: z.ZodError): string[] {
  return error.issues.map((issue) => issue.path.join(".") || "(root)");
}

/**
 * Shared safeParse helper. Never casts `raw` to T. Never throws.
 * Telemetry is the caller's job via `onMismatch` (endpoint + issue paths only).
 */
export function validateContract<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  options: ContractValidationOptions,
): ContractValidationResult<T> {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { valid: true, data: parsed.data };

  const issuePaths = issuePathsFromZod(parsed.error);
  options.onMismatch?.({ endpoint: options.endpoint, issuePaths });
  return { valid: false, raw, issues: issuePaths };
}

export class ContractValidationError extends Error {
  readonly endpoint: string;
  readonly issues: string[];

  constructor(endpoint: string, issues: string[]) {
    super(`contract mismatch at ${endpoint}`);
    this.name = "ContractValidationError";
    this.endpoint = endpoint;
    this.issues = issues;
  }
}

/**
 * Report mode: run `adapt` on the raw value. Enforce mode: throw.
 * `adapt` receives `unknown` and must supply only documented defaults.
 */
export function readContract<T, Adapted>(
  schema: z.ZodType<T>,
  raw: unknown,
  options: ContractValidationOptions & {
    adapt: (raw: unknown) => Adapted;
  },
): T | Adapted {
  const mode = options.mode ?? getContractValidationMode();
  const result = validateContract(schema, raw, options);
  if (result.valid) return result.data;
  switch (mode) {
    case "report":
      return options.adapt(result.raw);
    case "enforce":
      throw new ContractValidationError(options.endpoint, result.issues);
    default: {
      const exhaustive: never = mode;
      throw new Error(`unknown contract validation mode: ${String(exhaustive)}`);
    }
  }
}
