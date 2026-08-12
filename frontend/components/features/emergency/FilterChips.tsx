"use client";

import { memo, type ReactNode } from "react";
import {
  MAP_REPORT_TYPE_KEYS,
  REPORT_TYPES,
  type ReportType,
} from "@/lib/types";
import ChipFilter from "@/components/ui/ChipFilter";

const REPORT_TYPE_SHORT: Record<ReportType, string> = {
  critical: "Crítica",
  supplies: "Suministros",
  shelter: "Acopio",
  nopower: "Sin luz",
  missing: "Buscan",
  building: "Edificios",
  starlink: "Starlink",
};

export interface FilterChipsProps {
  selectedTypes: Set<ReportType>;
  counts: Record<ReportType, number>;
  onChipClick: (type: ReportType) => void;
  children?: ReactNode;
}

function chipAria(label: string, count: number, active: boolean): string {
  const state = active
    ? "Visible en el mapa, toca para ocultar."
    : "Oculto en el mapa, toca para mostrar.";
  return `${label}: ${count} reportes. ${state}`;
}

function TypeChip({
  type,
  active,
  count,
  onChipClick,
}: {
  type: ReportType;
  active: boolean;
  count: number;
  onChipClick: (type: ReportType) => void;
}) {
  const meta = REPORT_TYPES[type];
  return (
    <ChipFilter
      active={active}
      onClick={() => onChipClick(type)}
      icon={meta.icon}
      color={meta.color}
      count={count}
      shortLabel={REPORT_TYPE_SHORT[type]}
      label={meta.label}
      description={meta.description}
      ariaLabel={chipAria(meta.label, count, active)}
    />
  );
}

function FilterChipsImpl({
  selectedTypes,
  counts,
  onChipClick,
  children,
}: FilterChipsProps) {
  return (
    <div
      className="e-map-type-filters flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
      role="group"
      aria-label="Filtrar capas del mapa por tipo"
    >
      {MAP_REPORT_TYPE_KEYS.map((type) => (
        <TypeChip
          key={type}
          type={type}
          active={selectedTypes.has(type)}
          count={counts[type]}
          onChipClick={onChipClick}
        />
      ))}
      {children}
    </div>
  );
}

export const FilterChips = memo(FilterChipsImpl);
export default FilterChips;
