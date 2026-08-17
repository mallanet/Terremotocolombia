import type { ModelField } from "../model-registry";
import type { ModelRow } from "../application/models-gateway";
import { statusBadge } from "./status-badges";

export function renderCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "sí" : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function parseFieldValue(field: ModelField, value: unknown): unknown {
  if (field.type === "number") return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

export function matchesQuery(row: ModelRow, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return Object.values(row).some((v) => {
    if (renderCell(v).toLowerCase().includes(needle)) return true;
    const badge = statusBadge(v);
    return badge !== null && badge.label.toLowerCase().includes(needle);
  });
}
