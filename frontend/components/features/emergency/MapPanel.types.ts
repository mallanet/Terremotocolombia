import type { GeocodeResult } from "@/components/features/emergency/AddressSearch";
import type { MapBounds } from "@/components/features/map";
import type { MissingMapMarker } from "@/hooks/missing";
import type { PetMapMarker } from "@/lib/pets";
import type { CollectionCenter } from "@/hooks/acopio";
import type { EmergencyReport, ReportType, Earthquake } from "@/lib/types";

export interface MapPanelProps {
  mapReports: EmergencyReport[];
  earthquakes?: Earthquake[];
  missingMapMarkers: MissingMapMarker[];
  showMissingOnMap: boolean;
  petMapMarkers: PetMapMarker[];
  showPetsOnMap: boolean;
  onTogglePets: () => void;
  acopioCenters: CollectionCenter[];
  showAcopioOnMap: boolean;
  onToggleAcopio: () => void;
  draft: { lat: number; lng: number } | null;
  confirmed: Set<string>;
  isAdmin: boolean;
  focus: { lat: number; lng: number; ts: number; id?: string } | null;
  fitRequest: { points: { lat: number; lng: number }[]; ts: number } | null;
  center: [number, number];
  selectedTypes: Set<ReportType>;
  counts: Record<ReportType, number>;
  addressBias: { lat: number; lng: number };
  placing: boolean;
  shareCopied: boolean;
  onBoundsChange: (bounds: MapBounds) => void;
  onPick: (lat: number, lng: number) => void;
  onResolve: (id: string) => void;
  onConfirm: (id: string) => void;
  onAddressSelect: (result: GeocodeResult) => void;
  onChipClick: (type: ReportType) => void;
  onCancelPlacing: () => void;
  onShare: () => void;
  onStartReport: () => void;
}
