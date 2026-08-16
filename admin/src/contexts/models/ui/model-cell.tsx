"use client";

/**
 * Cómo se pinta una celda de la tabla genérica: valores crudos, estados con
 * rótulo en español y la búsqueda client-side que los tiene en cuenta.
 * Extraído de model-table.tsx, que hacía las tres cosas a la vez.
 */
import type { ModelField } from "../model-registry";
import type { ModelRow } from "../application/models-gateway";

export function renderCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "sí" : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Rótulos en español + color para los estados conocidos (voluntarios, sus
 * tareas y la campaña). Así "¿ya se le envió?" se responde de un vistazo:
 * Pendiente = aún sin contactar; Contactado = ya se le envió correo.
 */
const STATUS_BADGES: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pendiente", classes: "bg-amber-100 text-amber-800" },
  contacted: { label: "Contactado", classes: "bg-blue-100 text-blue-800" },
  active: { label: "Activo", classes: "bg-green-100 text-green-800" },
  declined: { label: "Declinado", classes: "bg-gray-200 text-gray-600" },
  open: { label: "Abierta", classes: "bg-amber-100 text-amber-800" },
  assigned: { label: "Asignada", classes: "bg-blue-100 text-blue-800" },
  done: { label: "Terminada", classes: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelada", classes: "bg-gray-200 text-gray-600" },
  resolved: { label: "Resuelta", classes: "bg-green-100 text-green-800" },
  rejected: { label: "Rechazada", classes: "bg-red-100 text-red-700" },
  paused: { label: "Pausado", classes: "bg-amber-100 text-amber-800" },
  full: { label: "Sin espacio", classes: "bg-amber-100 text-amber-800" },
  closed: { label: "Cerrado", classes: "bg-gray-200 text-gray-600" },
  pledged: { label: "Comprometido", classes: "bg-amber-100 text-amber-800" },
  received: { label: "Recibido", classes: "bg-green-100 text-green-800" },
  partial: { label: "Parcial", classes: "bg-blue-100 text-blue-800" },
  expired: { label: "Vencido", classes: "bg-gray-200 text-gray-600" },
  loading: { label: "Cargando", classes: "bg-amber-100 text-amber-800" },
  in_transit: { label: "En camino", classes: "bg-blue-100 text-blue-800" },
  delivered: { label: "Entregado", classes: "bg-green-100 text-green-800" },
};

/** Opciones del dropdown de estado por modelo (solo los que editan status). */
const STATUS_OPTIONS: Record<string, readonly string[]> = {
  volunteers: ["pending", "contacted", "active", "declined"],
  "volunteer-tasks": ["open", "assigned", "done", "cancelled"],
  "deletion-requests": ["pending", "resolved", "rejected"],
  "campaign-sites": ["active", "paused", "full", "closed"],
  "campaign-shipments": ["loading", "in_transit", "delivered", "cancelled"],
};

export function hasStatusOptions(path: string): boolean {
  return Boolean(STATUS_OPTIONS[path]);
}

function statusBadge(value: unknown): { label: string; classes: string } | null {
  if (typeof value !== "string") return null;
  return STATUS_BADGES[value] ?? null;
}

function StatusBadge({ value }: { value: unknown }) {
  const badge = statusBadge(value);
  if (!badge) return <>{renderCell(value)}</>;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.classes}`}>
      {badge.label}
    </span>
  );
}

/**
 * Celda de estado: badge read-only, o <select> con pinta de badge cuando el
 * modelo edita status y el usuario puede editar — cambiar el estado es un
 * clic, sin abrir el formulario completo.
 */
export function StatusCell({
  path,
  value,
  editable,
  pending,
  onChange,
}: {
  path: string;
  value: unknown;
  editable: boolean;
  pending: boolean;
  onChange: (status: string) => void;
}) {
  const options = STATUS_OPTIONS[path];
  const badge = statusBadge(value);
  if (!editable || !options) return <StatusBadge value={value} />;
  return (
    <select
      aria-label="Cambiar estado"
      className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        badge?.classes ?? "bg-gray-100 text-gray-700"
      }`}
      value={typeof value === "string" ? value : ""}
      disabled={pending}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {STATUS_BADGES[option]?.label ?? option}
        </option>
      ))}
    </select>
  );
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
