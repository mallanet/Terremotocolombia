"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { SITE_PRODUCT_NAME } from "@/lib/site";
import { localizedDate } from "./helpers";
import { getRescueMapCopy } from "./copy";
import type {
  RescueMapIncident,
  RescueMapLanguage,
  RescueMapMappingAoi,
  RescueMapMappingProduct,
  RescueMapMappingSnapshot,
} from "@/lib/rescue-map";
import type { RescueMapModeOption } from "./RescueMapMapModes";
import type { RescueMapMode } from "@/lib/rescue-map";

interface RescueMapRailHeaderProps {
  language: RescueMapLanguage;
  mode: RescueMapMode;
  setMode: (mode: RescueMapMode) => void;
  selectedAoi: RescueMapMappingAoi | null;
  product: RescueMapMappingProduct | null;
  mapping: RescueMapMappingSnapshot;
  incident: RescueMapIncident;
  effectivelyOffline: boolean;
  connectionLabel: string;
  imageNeedsConnection: boolean;
  lastLocalUpdate: number;
  sheetExpanded: boolean;
  onToggleSheet: (event: React.MouseEvent<HTMLButtonElement>) => void;
  baseModes: RescueMapModeOption[];
  updateNotice: boolean;
}

// Top of the operational rail. Renders two layouts from the same element:
//   - mobile: a sticky drag-handle summary above a collapsed sheet of mode
//     buttons and a freshness line
//   - desktop: a full "what is this incident" header with copy, codes, and
//     the last-update / last-verified timestamps.
//
// Suppressed-hydration warnings on `<time>` stay here because the formatted
// timestamp depends on the user's timezone, which is only available on the
// client.
export default function RescueMapRailHeader({
  language,
  mode,
  setMode,
  selectedAoi,
  product,
  mapping,
  incident,
  effectivelyOffline,
  connectionLabel,
  imageNeedsConnection,
  lastLocalUpdate,
  sheetExpanded,
  onToggleSheet,
  baseModes,
  updateNotice,
}: RescueMapRailHeaderProps) {
  const text = getRescueMapCopy(language);
  return (
    <header className="e-rescue-rail-header">
      <div className="e-rescue-mobile-sheet-summary">
        <button
          type="button"
          className="e-rescue-sheet-toggle"
          data-testid="rescue-sheet-toggle"
          aria-label={sheetExpanded ? text.collapsePanel : text.expandPanel}
          aria-expanded={sheetExpanded}
          aria-controls="rescue-sheet-content"
          onClick={onToggleSheet}
        >
          <span className="e-rescue-sheet-handle" aria-hidden />
          <span className="e-rescue-sheet-copy">
            <span>
              {selectedAoi ? text.selectedArea : mapping.activationCode}
            </span>
            <strong>
              {selectedAoi ? selectedAoi.name[language] : text.officialAreas}
            </strong>
            <small>
              {selectedAoi && product
                ? `AOI ${String(selectedAoi.number).padStart(2, "0")} · ${product.type}`
                : `${mapping.aois.length} AOI · Copernicus`}
            </small>
          </span>
          <span className="e-rescue-sheet-toggle-icon" aria-hidden>
            {sheetExpanded ? (
              <ChevronDown size={20} strokeWidth={2.4} />
            ) : (
              <ChevronUp size={20} strokeWidth={2.4} />
            )}
          </span>
        </button>
        <div
          className="e-rescue-mobile-freshness"
          data-online={String(!effectivelyOffline)}
        >
          <span className="e-rescue-status-dot" aria-hidden />
          <strong>{connectionLabel}</strong>
          <time
            dateTime={new Date(lastLocalUpdate).toISOString()}
            suppressHydrationWarning
          >
            {localizedDate(lastLocalUpdate, language)}
          </time>
        </div>
        <div
          className="e-rescue-mode-control e-rescue-mobile-mode-control"
          role="group"
          aria-label={text.mapModes}
        >
          {baseModes.map((item) => (
            <button
              key={`mobile-${item.id}`}
              type="button"
              aria-label={item.label}
              aria-pressed={mode === item.id}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="e-rescue-mobile-map-context">
          {imageNeedsConnection
            ? text.imageryOffline
            : mode === "reference"
              ? text.referenceWarning
              : text.mapSource}
        </p>
      </div>

      <div className="e-rescue-desktop-intro">
        <div className="e-rescue-rail-top">
          <div className="e-rescue-identity">
            <span className="e-rescue-identity-mark" aria-hidden>
              +
            </span>
            <p>{SITE_PRODUCT_NAME}</p>
            <span className="e-rescue-activation">{mapping.activationCode}</span>
          </div>
        </div>
        <h1>{text.title}</h1>
        <p className="e-rescue-event-title">{incident.event.title[language]}</p>
        <div
          className="e-rescue-status-line"
          data-online={String(!effectivelyOffline)}
        >
          <span className="e-rescue-status-dot" aria-hidden />
          <strong>{connectionLabel}</strong>
          <span>
            {text.localUpdate}:{" "}
            <time
              dateTime={new Date(lastLocalUpdate).toISOString()}
              suppressHydrationWarning
            >
              {localizedDate(lastLocalUpdate, language)}
            </time>
          </span>
        </div>
        <div className="e-rescue-status-line">
          <strong>{text.verified}</strong>
          <time
            dateTime={mapping.lastCheckedAt}
            suppressHydrationWarning
          >
            {localizedDate(mapping.lastCheckedAt, language)}
          </time>
        </div>
        {updateNotice ? (
          <p
            className="e-rescue-package-message"
            role="status"
            aria-live="polite"
          >
            {text.newData}
          </p>
        ) : null}
      </div>
    </header>
  );
}
