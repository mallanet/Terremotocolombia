"use client";

import { useCallback, useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { MAP_TOUR_STORAGE_KEY, MAP_TUTORIAL_STEPS } from "./map-tutorial-steps";

export { MAP_TUTORIAL_STEPS, MAP_TOUR_STORAGE_KEY };

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
    onDestroyed: () => {
      try {
        localStorage.setItem(MAP_TOUR_STORAGE_KEY, "1");
      } catch {
        return;
      }
    },
  });
  tour.drive();
}

export default function MapTutorialButton() {
  const start = useCallback(() => startMapTour(), []);

  useEffect(() => {
    try {
      if (localStorage.getItem(MAP_TOUR_STORAGE_KEY)) return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => startMapTour(), 700);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <button
      type="button"
      onClick={start}
      aria-label="Cómo usar el mapa"
      title="Cómo usar el mapa"
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
    >
      <span aria-hidden>?</span>
      <span>Cómo usar</span>
    </button>
  );
}
