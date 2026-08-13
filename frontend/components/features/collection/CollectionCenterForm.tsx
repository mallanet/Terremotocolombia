"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LegalConsentNotice from "@/components/content/LegalConsentNotice";
import { useTurnstile } from "@/hooks/useTurnstile";
import { useGeocodeSearch } from "@/hooks/geocode";
import { usePrivacyConsent } from "@/components/layout/PrivacyConsentGate";
import { apiGet, apiSend, ApiError } from "@/lib/api";
import { deploymentConfig } from "@/lib/deployment-config";
import {
  ACOPIO_ACCEPT_OPTIONS,
  composeCenterNeeds,
} from "@/lib/acopio-center-needs";
import { saveAcopioEditToken } from "@/lib/acopio-edit-store";
import type { EmergencyReport } from "@/lib/types";

type Mode =
  | { kind: "create" }
  | { kind: "edit"; reportId: string; token: string };

export default function CollectionCenterForm({ mode }: { mode: Mode }) {
  const { ensureConsent } = usePrivacyConsent();
  const geocode = useGeocodeSearch();
  const { mountRef: turnstileMount, getToken: turnstileGetToken } = useTurnstile();
  const [place, setPlace] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [accepts, setAccepts] = useState<string[]>([]);
  const [schedule, setSchedule] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ id: string; token: string } | null>(null);

  useEffect(() => {
    if (mode.kind !== "edit") return;
    let cancelled = false;
    apiGet<{ report: EmergencyReport }>(`/api/reports/${mode.reportId}`)
      .then((data) => {
        if (cancelled) return;
        setPlace(data.report.place);
        setLat(data.report.lat);
        setLng(data.report.lng);
        setNotes(data.report.needs);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "No se pudo cargar el punto.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mode.kind, mode.kind === "edit" ? mode.reportId : ""]);

  function toggleAccept(value: string) {
    setAccepts((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  async function locate() {
    setError(null);
    if (!place.trim()) {
      setError("Escribe la dirección o el nombre del lugar.");
      return;
    }
    const bias = {
      lat: deploymentConfig.mapCenter[0],
      lng: deploymentConfig.mapCenter[1],
    };
    geocode.mutate(
      { q: place.trim(), bias },
      {
        onSuccess: (data) => {
          const first = data.results[0];
          if (!first) {
            setError("No encontramos esa dirección. Prueba con más detalle.");
            return;
          }
          setLat(first.lat);
          setLng(first.lng);
          if (first.label) setPlace(first.label);
        },
        onError: () => setError("No se pudo ubicar la dirección."),
      },
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!(await ensureConsent())) return;
    if (lat == null || lng == null) {
      setError("Ubica el punto en el mapa con el botón «Buscar dirección».");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const turnstileToken = await turnstileGetToken();
      const needs =
        mode.kind === "edit" && !accepts.length && !schedule && !contact
          ? notes
          : composeCenterNeeds({ accepts, schedule, contact, notes });
      if (mode.kind === "create") {
        const result = await apiSend<{
          report: EmergencyReport;
          editToken: string;
        }>("POST", "/api/reports", {
          type: "shelter",
          lat,
          lng,
          place: place.trim(),
          needs,
          turnstileToken,
        });
        saveAcopioEditToken(result.report.id, result.editToken);
        setDone({ id: result.report.id, token: result.editToken });
        return;
      }
      await apiSend("PATCH", `/api/reports/${mode.reportId}`, {
        editToken: mode.token,
        lat,
        lng,
        place: place.trim(),
        needs,
        turnstileToken,
      });
      setDone({ id: mode.reportId, token: mode.token });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const editHref = `/acopio/editar/${done.id}?token=${encodeURIComponent(done.token)}`;
    return (
      <div className="e-inner space-y-4">
        <p className="e-m-note e-m-note--info">
          {mode.kind === "create"
            ? "Punto registrado. Guarda este enlace para editarlo después."
            : "Cambios guardados."}
        </p>
        <p className="break-all text-sm">
          <Link href={editHref} className="e-m-link">
            {editHref}
          </Link>
        </p>
        <Link href="/acopio" className="e-m-btn e-m-btn--primary inline-flex">
          Ver directorio
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="e-inner space-y-4">
      <div>
        <label htmlFor="acopio-place" className="mb-1 block text-sm font-medium">
          Nombre o dirección
        </label>
        <input
          id="acopio-place"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          required
          maxLength={200}
          className="e-input py-2.5"
          placeholder="Ej: Cruz Roja, carrera 10 #12-32"
        />
      </div>
      <button
        type="button"
        onClick={locate}
        className="e-m-btn e-m-btn--primary"
        disabled={geocode.isPending}
      >
        {geocode.isPending ? "Buscando…" : "Buscar dirección"}
      </button>
      {lat != null && lng != null && (
        <p className="text-sm text-[var(--etext2)]">
          Ubicado: {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Qué reciben</legend>
        <div className="flex flex-wrap gap-2">
          {ACOPIO_ACCEPT_OPTIONS.map((opt) => (
            <label key={opt.value} className="e-m-chip">
              <input
                type="checkbox"
                className="mr-1"
                checked={accepts.includes(opt.value)}
                onChange={() => toggleAccept(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="acopio-schedule" className="mb-1 block text-sm font-medium">
          Horario (opcional)
        </label>
        <input
          id="acopio-schedule"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          maxLength={120}
          className="e-input py-2.5"
        />
      </div>
      <div>
        <label htmlFor="acopio-contact" className="mb-1 block text-sm font-medium">
          Contacto (opcional)
        </label>
        <input
          id="acopio-contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          maxLength={120}
          className="e-input py-2.5"
        />
      </div>
      <div>
        <label htmlFor="acopio-notes" className="mb-1 block text-sm font-medium">
          Detalles
        </label>
        <textarea
          id="acopio-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={800}
          rows={4}
          className="e-input py-2.5"
        />
      </div>
      <div ref={turnstileMount} />
      <LegalConsentNotice />
      {error && <p className="e-m-alert-error">{error}</p>}
      <button type="submit" className="e-m-btn e-m-btn--primary" disabled={submitting}>
        {submitting
          ? "Guardando…"
          : mode.kind === "create"
            ? "Registrar punto"
            : "Guardar cambios"}
      </button>
    </form>
  );
}
