"use client";

import { ChevronDown } from "lucide-react";
import { getRescueMapCopy } from "./copy";
import type {
  RescueMapComparisonState,
  RescueMapLanguage,
  RescueMapMappingSnapshot,
  RescueMapMode,
} from "@/lib/rescue-map";

export interface RescueMapModeOption {
  id: RescueMapMode;
  label: string;
  available: boolean;
}

interface RescueMapMapModesProps {
  language: RescueMapLanguage;
  mode: RescueMapMode;
  setMode: (mode: RescueMapMode) => void;
  mapping: RescueMapMappingSnapshot;
  baseModes: RescueMapModeOption[];
  comparisonModes: RescueMapModeOption[];
  imageNeedsConnection: boolean;
}

// Map for the desktop comparison disclosure. Kept local to the section so it
// does not need to surface the full `copy` table just to label a status.
function comparisonStateLabel(
  state: RescueMapComparisonState,
  text: ReturnType<typeof getRescueMapCopy>,
): string {
  switch (state) {
    case "scheduled":
      return text.comparisonScheduled;
    case "partial":
      return text.comparisonPartial;
    case "ready":
      return text.comparisonReady;
    default:
      return text.comparisonUnknown;
  }
}

// Base/compare mode buttons + the contextual "what this layer is" notice.
// `rescue-comparison-waiting` is the only element exposing a `data-tone`
// attribute in the rail, so the CSS hooks onto that.
export default function RescueMapMapModes({
  language,
  mode,
  setMode,
  mapping,
  baseModes,
  comparisonModes,
  imageNeedsConnection,
}: RescueMapMapModesProps) {
  const text = getRescueMapCopy(language);
  return (
    <section className="e-rescue-section" aria-labelledby="rescue-map-modes">
      <div className="e-rescue-desktop-mode-block">
        <div className="e-rescue-section-heading">
          <h2 id="rescue-map-modes">{text.mapModes}</h2>
        </div>
        <div
          className="e-rescue-mode-control"
          role="group"
          aria-label={text.mapModes}
        >
          {baseModes.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-pressed={mode === item.id}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <details className="e-rescue-comparison">
        <summary>
          <span>{text.compareImages}</span>
          <span className="e-rescue-section-status">
            {comparisonStateLabel(mapping.imagery.comparisonState, text)}
          </span>
          <ChevronDown
            className="e-rescue-disclosure-chevron"
            aria-hidden
            size={17}
            strokeWidth={2.2}
          />
        </summary>
        <div className="e-rescue-comparison-body">
          <div
            className="e-rescue-mode-control"
            role="group"
            aria-label={text.compareImages}
          >
            {comparisonModes.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-pressed={mode === item.id}
                disabled={!item.available}
                aria-describedby={
                  !item.available ? "rescue-comparison-waiting" : undefined
                }
                title={!item.available ? text.unavailable : undefined}
                onClick={() => setMode(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </details>

      <div
        id="rescue-comparison-waiting"
        className="e-rescue-notice"
        data-tone={imageNeedsConnection ? "offline" : "reference"}
        role="status"
      >
        <strong>
          {imageNeedsConnection
            ? text.imageryOffline
            : mode === "reference"
              ? text.referenceWarning
              : mode === "map"
                ? text.mapSource
                : text.scheduled}
        </strong>
        <p>
          {imageNeedsConnection
            ? text.imageryOfflineDetail
            : mode === "reference"
              ? text.referenceDetail
              : mode === "map"
                ? text.mapDetail
                : text.waitingSummary}
        </p>
      </div>
    </section>
  );
}
