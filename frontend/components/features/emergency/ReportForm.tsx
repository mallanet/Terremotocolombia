"use client";

import { useCallback, useState, type FormEvent } from "react";
import { MapPin, X } from "lucide-react";
import LegalConsentNotice from "@/components/content/LegalConsentNotice";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { useTurnstile } from "@/hooks/useTurnstile";
import { usePrivacyConsent } from "@/components/layout/PrivacyConsentGate";
import { trackEvent } from "@/lib/openpanel";
import { MAP_REPORT_TYPE_KEYS, REPORT_TYPES, type ReportType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { copyFor } from "./report-form-helpers";

interface ReportFormProps {
  /** Ubicación elegida, o null mientras el usuario aún no la define. */
  coords: { lat: number; lng: number } | null;
  onCancel: () => void;
  onCoordsChange?: (coords: { lat: number; lng: number }) => void;
  /** Oculta el modal sin desmontarlo (conserva lo escrito) mientras el usuario
   * elige el punto tocando el mapa. */
  hidden?: boolean;
  /** Solicita elegir la ubicación tocando el mapa. */
  onPickOnMap?: () => void;
  /** Quita la ubicación elegida (vuelve a "sin definir"). */
  onClearLocation?: () => void;
  onSubmit: (payload: {
    type: ReportType;
    place: string;
    affected: number;
    needs: string;
    photo: string | null;
    volunteerCode?: string;
    turnstileToken?: string;
  }) => Promise<void>;
}

export default function ReportForm({
  coords,
  onCancel,
  onCoordsChange,
  hidden = false,
  onPickOnMap,
  onClearLocation,
  onSubmit,
}: ReportFormProps) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const open = !hidden;
  const { ensureConsent } = usePrivacyConsent();
  const { mountRef: turnstileMount, getToken: turnstileGetToken } = useTurnstile();

  const [type, setType] = useState<ReportType>("supplies");
  const [place, setPlace] = useState("");
  const [affected, setAffected] = useState("");
  const [needs, setNeeds] = useState("");
  const [volunteerCode, setVolunteerCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const {
    fileRef: fileInputRef,
    photo,
    processing: processingPhoto,
    handleFile,
    clearPhoto,
  } = usePhotoUpload({ onError: setError });

  const useMyLocation = useCallback(() => {
    trackEvent("report_use_geolocation");
    if (!("geolocation" in navigator)) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onCoordsChange?.({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Permiso denegado. Activa la ubicación en los permisos del sitio."
            : "No se pudo obtener tu ubicación. Toca el mapa manualmente.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [onCoordsChange]);

  const copy = copyFor(type);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!(await ensureConsent())) return;
    setError(null);
    if (!coords) {
      setError(
        "Elige la ubicación del reporte: tócala en el mapa o usa tu ubicación.",
      );
      return;
    }
    if (!place.trim()) {
      setError("Indica el nombre o dirección del lugar.");
      return;
    }
    setSubmitting(true);
    try {
      const turnstileToken = await turnstileGetToken();
      await onSubmit({
        type,
        place: place.trim(),
        affected: copy.showAffected ? Number(affected) || 0 : 0,
        needs: needs.trim(),
        photo,
        volunteerCode: volunteerCode.trim() || undefined,
        turnstileToken,
      });
      trackEvent("report_created", {
        reportType: type,
        affected: copy.showAffected ? Number(affected) || 0 : 0,
        hasPhoto: Boolean(photo),
        hasNeeds: Boolean(needs.trim()),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al publicar.");
      setSubmitting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    // Solo cerrar del todo si el usuario descarta el diálogo visible.
    // Cuando `hidden` es true (elige en el mapa), `open` baja a false sin cancelar.
    if (!next && !hidden) onCancel();
  }

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        {isMobile ? (
          <>
            <SheetTitle className="font-heading text-lg">
              Reportar Información
            </SheetTitle>
            <SheetDescription>
              Lo que compartas ayuda a coordinar la respuesta en tu zona.
            </SheetDescription>
          </>
        ) : (
          <>
            <DialogTitle className="font-heading text-lg">
              Reportar Información
            </DialogTitle>
            <DialogDescription>
              Lo que compartas ayuda a coordinar la respuesta en tu zona.
            </DialogDescription>
          </>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onCancel}
        data-track="report_modal_close"
        aria-label="Cerrar"
        className="shrink-0"
      >
        <X />
      </Button>
    </div>
  );

  const form = (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <div
        className={cn(
          "rounded-xl border p-3",
          coords
            ? "border-border bg-muted/40"
            : "border-amber-300 bg-amber-50 text-amber-950",
        )}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-semibold">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {coords ? (
              <span className="truncate font-normal tabular-nums text-muted-foreground">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            ) : (
              <span className="font-normal text-amber-800">
                Ubicación sin definir — elígela aquí
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {onPickOnMap && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPickOnMap}
              >
                Elegir en el mapa
              </Button>
            )}
            {onCoordsChange && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={useMyLocation}
                data-track="report_use_geolocation_click"
                disabled={locating}
              >
                {locating ? "Localizando…" : "Usar mi ubicación"}
              </Button>
            )}
            {coords && onClearLocation && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClearLocation}
                aria-label="Quitar la ubicación elegida"
              >
                Quitar
              </Button>
            )}
          </div>
        </div>
      </div>

      {geoError && (
        <Alert variant="destructive">
          <AlertDescription>{geoError}</AlertDescription>
        </Alert>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Tipo de marcador</legend>
        <div className="grid grid-cols-2 gap-2">
          {MAP_REPORT_TYPE_KEYS.map((key) => {
            const meta = REPORT_TYPES[key];
            const active = type === key;
            return (
              <label
                key={key}
                data-track="report_type_selected"
                data-report-type={key}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2.5 transition",
                  active
                    ? "shadow-sm"
                    : "border-border bg-background hover:bg-muted/50",
                )}
                style={
                  active
                    ? { borderColor: meta.color, background: `${meta.color}14` }
                    : undefined
                }
              >
                <input
                  type="radio"
                  name="type"
                  value={key}
                  checked={active}
                  onChange={() => setType(key)}
                  className="sr-only"
                />
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-base text-white"
                  style={{ background: meta.color }}
                  aria-hidden
                >
                  {meta.icon}
                </span>
                <span className="min-w-0 text-xs font-semibold leading-tight">
                  {meta.label}
                </span>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {REPORT_TYPES[type].description}
        </p>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="place">{copy.placeLabel}</Label>
        <Input
          id="place"
          type="text"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder={copy.placePlaceholder}
          required
        />
      </div>

      {copy.showAffected && (
        <div className="space-y-1.5">
          <Label htmlFor="affected">{copy.affectedLabel}</Label>
          <Input
            id="affected"
            type="number"
            min={0}
            value={affected}
            onChange={(e) => setAffected(e.target.value)}
            placeholder="0"
            className="w-28"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="needs">{copy.needsLabel}</Label>
        <Textarea
          id="needs"
          value={needs}
          onChange={(e) => setNeeds(e.target.value)}
          rows={3}
          placeholder={copy.needsPlaceholder}
          className="resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="volunteer-code">
          ¿Eres voluntario? Tu código (opcional)
        </Label>
        <Input
          id="volunteer-code"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={volunteerCode}
          onChange={(e) => setVolunteerCode(e.target.value)}
          placeholder="483 920"
          maxLength={12}
          className="w-40 font-mono tracking-widest"
        />
        <p className="text-[11px] text-muted-foreground">
          Si te registraste como voluntario, tu código firma este reporte:
          sabremos que viene de ti.
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">
          {type === "building"
            ? "Foto del edificio (muy recomendada)"
            : "Foto (opcional)"}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={processingPhoto}
          className="e-report-modal__upload"
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt="Vista previa"
              className="e-report-modal__upload-preview"
            />
          ) : (
            <span className="e-report-modal__upload-icon" aria-hidden>
              📷
            </span>
          )}
          <span className="e-report-modal__upload-text">
            <strong>
              {processingPhoto
                ? "Procesando…"
                : photo
                  ? "Cambiar foto"
                  : "Subir foto"}
            </strong>
            <span>
              {type === "building"
                ? "Muestra grietas, inclinaciones, fachadas o columnas. Útil para que ingenieros evalúen."
                : "Ayuda a los rescatistas a verificar la situación."}
            </span>
          </span>
        </button>
        {photo && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearPhoto}
            className="text-muted-foreground hover:text-destructive"
          >
            Quitar foto
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div ref={turnstileMount} className="flex justify-center empty:hidden" />

      <LegalConsentNotice className="text-xs text-muted-foreground" />

      <div className="sticky bottom-0 -mx-4 mt-auto flex gap-2 border-t bg-popover px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={submitting || processingPhoto}
          className="flex-1 bg-destructive text-white hover:bg-[#a30d1e]"
        >
          {submitting ? "Publicando…" : "Reportar información"}
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="z-[2000] max-h-[92dvh] gap-0 overflow-hidden rounded-t-2xl p-0"
        >
          <SheetHeader className="border-b px-4 py-3 text-left">
            {header}
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">{form}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="z-[2000] flex max-h-[92dvh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader className="border-b px-5 py-4 text-left sm:px-6">
          {header}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {form}
        </div>
      </DialogContent>
    </Dialog>
  );
}
