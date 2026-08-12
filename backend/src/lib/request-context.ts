import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const requestIds = new WeakMap<Request, string>();

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const id = randomUUID();
  requestIds.set(req, id);
  res.setHeader("X-Request-Id", id);
  next();
}

export function requestId(req: Request): string {
  return requestIds.get(req) ?? "unknown";
}
