"use client";

import { renderCell } from "./model-cell";
import { STATUS_BADGES, STATUS_OPTIONS, statusBadge } from "./status-badges";

export function StatusBadge({ value }: { value: unknown }) {
  const badge = statusBadge(value);
  if (!badge) return <>{renderCell(value)}</>;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.classes}`}>
      {badge.label}
    </span>
  );
}

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
