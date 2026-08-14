"use client";

import { useCallback } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { MAP_TUTORIAL_STEPS } from "./map-tutorial-steps";

export { MAP_TUTORIAL_STEPS };

export function startMapTour(): void {
  const tour = driver({
    showProgress: true,
    nextBtnText: "Siguiente",
    prevBtnText: "Anterior",
    doneBtnText: "Listo",
    progressText: "{{current}} de {{total}}",
    steps: MAP_TUTORIAL_STEPS.map((step) => ({
      element: step.element,
      popover: { title: step.title, description: step.body },
    })),
  });
  tour.drive();
}

type MapTutorialButtonProps = {
  variant?: "overlay" | "toolbar";
};

export default function MapTutorialButton({
  variant = "overlay",
}: MapTutorialButtonProps) {
  const start = useCallback(() => startMapTour(), []);
  const className =
    variant === "toolbar"
      ? "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[var(--eborder)] bg-[var(--esurf)] px-4 py-2 text-sm font-semibold text-[var(--etext)] shadow-sm transition hover:bg-[var(--einput)]"
      : "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100";

  return (
    <button
      type="button"
      onClick={start}
      aria-label="Cómo usar el mapa"
      title="Cómo usar el mapa"
      className={className}
    >
      <span aria-hidden>?</span>
      <span className={variant === "toolbar" ? undefined : "hidden sm:inline"}>
        Cómo usar
      </span>
    </button>
  );
}
