"use client";

import type { MouseEvent, RefObject } from "react";
import RescueMapRailHeader from "./RescueMapRailHeader";
import RescueMapSelection from "./RescueMapSelection";
import RescueMapEventDetails from "./RescueMapEventDetails";
import RescueMapMapModes, { type RescueMapModeOption } from "./RescueMapMapModes";
import RescueMapAoiList from "./RescueMapAoiList";
import RescueMapFutureLayers from "./RescueMapFutureLayers";
import RescueMapSources from "./RescueMapSources";
import RescueMapOfflineTools from "./RescueMapOfflineTools";
import type {
  RescueMapIncident,
  RescueMapLanguage,
  RescueMapMappingAoi,
  RescueMapMappingImage,
  RescueMapMappingProduct,
  RescueMapMappingSnapshot,
  RescueMapMode,
} from "@/lib/rescue-map";

interface RescueMapRailProps {
  language: RescueMapLanguage;
  incident: RescueMapIncident;
  mapping: RescueMapMappingSnapshot;
  mode: RescueMapMode;
  setMode: (mode: RescueMapMode) => void;
  selectedAoi: RescueMapMappingAoi | null;
  product: RescueMapMappingProduct | null;
  image: RescueMapMappingImage | null;
  selectedAoiId: string | null;
  selectAoi: (aoiId: string) => void;
  clearSelection: () => void;
  isMobile: boolean;
  sheetExpanded: boolean;
  onToggleSheet: (event: MouseEvent<HTMLButtonElement>) => void;
  railContentRef: RefObject<HTMLDivElement | null>;
  effectivelyOffline: boolean;
  connectionLabel: string;
  imageNeedsConnection: boolean;
  lastLocalUpdate: number;
  updateNotice: boolean;
  baseModes: RescueMapModeOption[];
  comparisonModes: RescueMapModeOption[];
  incidentPath: string;
  mappingPath: string;
}

// Outer `<aside className="e-rescue-rail">`. The header holds the mobile
// sheet toggle + desktop intro; the inner scroll container holds the
// sections. Sheet open/closed state is owned by the parent so the body
// class toggle on `document.body` and `localStorage` stay in one place.
export default function RescueMapRail({
  language,
  incident,
  mapping,
  mode,
  setMode,
  selectedAoi,
  product,
  image,
  selectedAoiId,
  selectAoi,
  clearSelection,
  isMobile,
  sheetExpanded,
  onToggleSheet,
  railContentRef,
  effectivelyOffline,
  connectionLabel,
  imageNeedsConnection,
  lastLocalUpdate,
  updateNotice,
  baseModes,
  comparisonModes,
  incidentPath,
  mappingPath,
}: RescueMapRailProps) {
  return (
    <aside
      className="e-rescue-rail"
      data-sheet-state={isMobile && sheetExpanded ? "expanded" : "compact"}
      aria-label={
        language === "es"
          ? "Panel operacional del incidente"
          : "Incident operations panel"
      }
    >
      <RescueMapRailHeader
        language={language}
        mode={mode}
        setMode={setMode}
        selectedAoi={selectedAoi}
        product={product}
        mapping={mapping}
        incident={incident}
        effectivelyOffline={effectivelyOffline}
        connectionLabel={connectionLabel}
        imageNeedsConnection={imageNeedsConnection}
        lastLocalUpdate={lastLocalUpdate}
        sheetExpanded={sheetExpanded}
        onToggleSheet={onToggleSheet}
        baseModes={baseModes}
        updateNotice={updateNotice}
      />
      <div
        id="rescue-sheet-content"
        ref={railContentRef}
        className="e-rescue-rail-content"
        hidden={isMobile && !sheetExpanded}
      >
        {selectedAoi && product ? (
          <RescueMapSelection
            language={language}
            aoi={selectedAoi}
            product={product}
            image={image}
            isMobile={isMobile}
            onClear={clearSelection}
          />
        ) : null}
        <RescueMapEventDetails
          language={language}
          incident={incident}
          mapping={mapping}
        />
        <RescueMapMapModes
          language={language}
          mode={mode}
          setMode={setMode}
          mapping={mapping}
          baseModes={baseModes}
          comparisonModes={comparisonModes}
          imageNeedsConnection={imageNeedsConnection}
        />
        <RescueMapAoiList
          language={language}
          mapping={mapping}
          selectedAoiId={selectedAoiId}
          onSelect={selectAoi}
          onClear={clearSelection}
        />
        <RescueMapFutureLayers language={language} />
        <RescueMapSources
          language={language}
          incident={incident}
          mapping={mapping}
          incidentPath={incidentPath}
          mappingPath={mappingPath}
        />
        <RescueMapOfflineTools
          language={language}
          incident={incident}
          mapping={mapping}
        />
      </div>
    </aside>
  );
}
