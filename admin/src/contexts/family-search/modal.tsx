"use client";

/**
 * ÚNICA excepción a la convención "sin modales" de este panel (paneles
 * lado-a-lado en todo lo demás — ver `admin/AGENTS.md`/doc de requisitos
 * §7.4): la escalación de fusión anclada (R18) y la confirmación de unmerge
 * son decisiones "estás seguro" deliberadamente pesadas. Focus trap +
 * Escape-to-cancel + devuelve el foco al elemento que abrió el modal.
 */
import { useEffect, useRef, type ReactNode } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  title,
  onCancel,
  children,
}: {
  title: string;
  /** Escape o click en el fondo — SIEMPRE cierra sin disparar ninguna
   *  mutación (el caller decide si hay algo que limpiar). */
  onCancel: () => void;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    const focusable = container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusable?.[0] ?? container)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !container) return;
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-lg border bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar"
            className="text-gray-400 hover:text-gray-700"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
