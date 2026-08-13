"use client";

import { Button } from "@/components/ui/button";

export type PersonStatusFilter = "all" | "active" | "found";

interface ZoneFiltersProps {
  filter: PersonStatusFilter;
  onChange: (filter: PersonStatusFilter) => void;
}

export function ZoneFilters({ filter, onChange }: ZoneFiltersProps) {
  return (
    <div
      role="group"
      aria-label="Filtrar personas"
      className="mt-3 mb-3 flex flex-wrap items-center gap-1.5"
    >
      <Button
        type="button"
        size="sm"
        variant={filter === "all" ? "default" : "outline"}
        aria-pressed={filter === "all"}
        onClick={() => onChange("all")}
        className="rounded-full"
      >
        Todas
      </Button>
      <Button
        type="button"
        size="sm"
        variant={filter === "active" ? "default" : "outline"}
        aria-pressed={filter === "active"}
        onClick={() => onChange("active")}
        className="rounded-full"
      >
        <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
        Desaparecidas
      </Button>
      <Button
        type="button"
        size="sm"
        variant={filter === "found" ? "default" : "outline"}
        aria-pressed={filter === "found"}
        onClick={() => onChange("found")}
        className="rounded-full"
      >
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-primary group-data-[variant=default]/button:bg-white"
        />
        Encontradas
      </Button>
    </div>
  );
}
