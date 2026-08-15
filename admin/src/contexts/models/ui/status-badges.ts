export const STATUS_BADGES: Record<string, { label: string; classes: string }> = {
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
};

export const STATUS_OPTIONS: Record<string, readonly string[]> = {
  volunteers: ["pending", "contacted", "active", "declined"],
  "volunteer-tasks": ["open", "assigned", "done", "cancelled"],
  "deletion-requests": ["pending", "resolved", "rejected"],
};

export function statusBadge(value: unknown): { label: string; classes: string } | null {
  if (typeof value !== "string") return null;
  return STATUS_BADGES[value] ?? null;
}
