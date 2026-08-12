"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LegalConsentNotice from "@/components/content/LegalConsentNotice";
import { MAP_REPORT_TYPE_KEYS, REPORT_TYPES, type ReportType } from "@/lib/types";
import { trackEvent } from "@/lib/openpanel";
import { useTurnstile } from "@/hooks/useTurnstile";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { copyFor } from "./report-form-helpers";
import { usePrivacyConsent } from "@/components/layout/PrivacyConsentGate";

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
  const { ensureConsent } = usePrivacyConsent();
  const dialogRef = useRef<HTMLDivElement>(null);
  const { mountRef: turnstileMount, getToken: turnstileGetToken } = useTurnstile();
  // Al abrir (o al volver de "elegir en el mapa") movemos el foco al modal para
  // que Esc lo cierre de inmediato, y por accesibilidad.
  useEffect(() => {
    if (!hidden) dialogRef.current?.focus({ preventScroll: true });
  }, [hidden]);

  const [type, setType] = useState<ReportType>("supplies");
  const [place, setPlace] = useState("");
  const [affected, setAffected] = useState("");
  const [needs, setNeeds] = useState("");
  const [volunteerCode, setVolunteerCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const { fileRef: fileInputRef, photo, processing: processingPhoto, handleFile, clearPhoto } = usePhotoUpload({ onError: setError });

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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Consentimiento ANTES de enviar datos personales. Si la persona no acepta,
    // no se envia nada. Ver components/layout/PrivacyConsentGate.tsx.
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
      // Token FRESCO de Turnstile para este envío (se resetea tras leerlo).
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

  return (
    <div
      className={`fixed inset-0 z-[2000] flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4 ${
        hidden ? "hidden" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-[var(--esurf)] shadow-xl outline-none sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--eborder)] px-5 pb-3 pt-4 sm:px-6">
          <div>
            <h2 id="form-title" className="e-report-modal__title">
              Reportar Información
            </h2>
            <p className="e-report-modal__subtitle">
              Lo que compartas ayuda a coordinar la respuesta en tu zona.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            data-track="report_modal_close"
            aria-label="Cerrar"
            className="e-report-modal__close"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6"
        >
          <div
            className={`rounded-xl border p-3 ${
              coords
                ? "border-[var(--eborder)] bg-[var(--esurf2)]"
                : "border-amber-300 bg-amber-50"
            }`}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-semibold text-[var(--etext)]">
                <span aria-hidden>📍</span>
                {coords ? (
                  <span className="truncate font-normal tabular-nums text-[var(--etext2)]">
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </span>
                ) : (
                  <span className="font-normal text-amber-700">
                    Ubicación sin definir — elígela aquí
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {onPickOnMap && (
                  <button
                    type="button"
                    onClick={onPickOnMap}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--eborder)] bg-[var(--esurf)] px-2.5 py-1.5 text-xs font-semibold text-[var(--etext)] hover:bg-[var(--esurf2)]"
                  >
                    🗺️ Elegir en el mapa
                  </button>
                )}
                {onCoordsChange && (
                  <button
                    type="button"
                    onClick={useMyLocation}
                    data-track="report_use_geolocation_click"
                    disabled={locating}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--eborder)] bg-[var(--esurf)] px-2.5 py-1.5 text-xs font-medium text-[var(--etext)] hover:bg-[var(--esurf2)] disabled:opacity-60"
                  >
                    {locating ? "Localizando…" : "🛰️ Usar mi ubicación"}
                  </button>
                )}
                {coords && onClearLocation && (
                  <button
                    type="button"
                    onClick={onClearLocation}
                    aria-label="Quitar la ubicación elegida"
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--eborder)] bg-[var(--esurf)] px-2.5 py-1.5 text-xs font-medium text-[var(--etext2)] hover:bg-[var(--esurf2)]"
                  >
                    ✕ Quitar
                  </button>
                )}
              </div>
            </div>
          </div>
          {geoError && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
              {geoError}
            </p>
          )}

          <fieldset>
            <legend className="e-report-modal__label">
              Tipo de marcador
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {MAP_REPORT_TYPE_KEYS.map((key) => {
                const meta = REPORT_TYPES[key];
                const active = type === key;
                return (
                  <label
                    key={key}
                    data-track="report_type_selected"
                    data-report-type={key}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2.5 transition ${
                      active
                        ? "shadow-sm"
                        : "border-[var(--eborder)] bg-[var(--esurf)] hover:border-[var(--etext3)] hover:bg-[var(--esurf2)]"
                    }`}
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
                    <span className="min-w-0 text-xs font-semibold leading-tight text-[var(--etext)]">
                      {meta.label}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[var(--etext2)]">
              {REPORT_TYPES[type].description}
            </p>
          </fieldset>

          <div>
            <label
              htmlFor="place"
              className="e-report-modal__label"
            >
              {copy.placeLabel}
            </label>
            <input
              id="place"
              type="text"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder={copy.placePlaceholder}
              className="e-input"
              required
            />
          </div>

          {copy.showAffected && (
            <div>
              <label
                htmlFor="affected"
                className="e-report-modal__label"
              >
                {copy.affectedLabel}
              </label>
              <input
                id="affected"
                type="number"
                min={0}
                value={affected}
                onChange={(e) => setAffected(e.target.value)}
                placeholder="0"
                className="e-input w-28"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="needs"
              className="e-report-modal__label"
            >
              {copy.needsLabel}
            </label>
            <textarea
              id="needs"
              value={needs}
              onChange={(e) => setNeeds(e.target.value)}
              rows={3}
              placeholder={copy.needsPlaceholder}
              className="e-input resize-none"
            />
          </div>

          <div>
            <label
              htmlFor="volunteer-code"
              className="e-report-modal__label"
            >
              ¿Eres voluntario? Tu código (opcional)
            </label>
            <input
              id="volunteer-code"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={volunteerCode}
              onChange={(e) => setVolunteerCode(e.target.value)}
              placeholder="483 920"
              maxLength={12}
              className="e-input w-40 font-mono tracking-widest"
            />
            <p className="mt-1 text-[11px] text-[var(--etext2)]">
              Si te registraste como voluntario, tu código firma este reporte:
              sabremos que viene de ti.
            </p>
          </div>

          <div>
            <p className="e-report-modal__label">
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
              <button
                type="button"
                onClick={clearPhoto}
                className="mt-1.5 text-xs text-[var(--etext2)] hover:text-red-500"
              >
                Quitar foto
              </button>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-[var(--eayuda-bd)] bg-[var(--eayuda-bg)] px-3 py-2 text-sm text-[var(--eayuda-ic)]"
            >
              {error}
            </p>
          )}

          <div ref={turnstileMount} className="flex justify-center empty:hidden" />

          <LegalConsentNotice className="text-xs text-[var(--etext2)]" />

          <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-[var(--eborder)] bg-[var(--esurf)] px-5 py-3 sm:-mx-6 sm:px-6">
            <button
              type="button"
              onClick={onCancel}
              className="e-btn e-btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || processingPhoto}
              className="e-btn e-btn-primary flex-1 disabled:opacity-60"
            >
              {submitting ? "Publicando…" : "Reportar información"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
