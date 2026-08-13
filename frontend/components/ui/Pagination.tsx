"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";

export function pageWindow(page: number, totalPages: number): number[] {
  const span = 2;
  const start = Math.max(1, Math.min(page - span, totalPages - span * 2));
  const end = Math.min(totalPages, Math.max(page + span, span * 2 + 1));
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return pages;
}

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  ariaLabel?: string;
}

function PaginationImpl({
  page,
  totalPages,
  onPageChange,
  ariaLabel = "Paginación",
}: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = pageWindow(page, totalPages);
  const first = pages[0] ?? 1;
  const last = pages[pages.length - 1] ?? totalPages;

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-center gap-1.5" aria-label={ariaLabel}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        ← Anterior
      </Button>
      {first > 1 && (
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(1)}>
            1
          </Button>
          {first > 2 && <span className="px-1 text-muted-foreground">…</span>}
        </>
      )}
      {pages.map((p) => (
        <Button
          key={p}
          type="button"
          variant={p === page ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(p)}
          aria-current={p === page ? "page" : undefined}
        >
          {p}
        </Button>
      ))}
      {last < totalPages && (
        <>
          {last < totalPages - 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages}
          </Button>
        </>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
      >
        Siguiente →
      </Button>
    </nav>
  );
}

export const Pagination = memo(PaginationImpl);
export default Pagination;
