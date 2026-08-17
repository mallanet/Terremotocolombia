import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const requestIds = new WeakMap<Request, string>();

interface RequestTelemetry {
  id: string;
  dbQueries: number;
  dbDurationMs: number;
  dbRetries: number;
  dbFailures: number;
}

const requestTelemetry = new AsyncLocalStorage<RequestTelemetry>();

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const id = randomUUID();
  requestIds.set(req, id);
  res.setHeader("X-Request-Id", id);
  requestTelemetry.run(
    { id, dbQueries: 0, dbDurationMs: 0, dbRetries: 0, dbFailures: 0 },
    next,
  );
}

export function requestId(req: Request): string {
  return requestIds.get(req) ?? "unknown";
}

/**
 * Records one database round trip in the current request context. This is
 * observability-only: authorization and tenancy must never depend on this ALS
 * context because runtimes may lose it across unusual async boundaries.
 */
export function recordDatabaseCall(input: {
  durationMs: number;
  retries: number;
  failed: boolean;
}): void {
  const telemetry = requestTelemetry.getStore();
  if (!telemetry) return;
  // One logical call can perform more than one network round trip when the
  // read-only retry policy activates. Count all attempts because that is the
  // database/compute load operators need to see.
  telemetry.dbQueries += 1 + input.retries;
  telemetry.dbDurationMs += input.durationMs;
  telemetry.dbRetries += input.retries;
  if (input.failed) telemetry.dbFailures += 1;
}

export function databaseTelemetry(): Readonly<
  Pick<RequestTelemetry, "dbQueries" | "dbDurationMs" | "dbRetries" | "dbFailures">
> {
  const telemetry = requestTelemetry.getStore();
  return telemetry
    ? {
        dbQueries: telemetry.dbQueries,
        dbDurationMs: telemetry.dbDurationMs,
        dbRetries: telemetry.dbRetries,
        dbFailures: telemetry.dbFailures,
      }
    : { dbQueries: 0, dbDurationMs: 0, dbRetries: 0, dbFailures: 0 };
}
