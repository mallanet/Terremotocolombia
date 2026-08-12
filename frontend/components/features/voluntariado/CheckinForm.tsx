"use client";

import { useState } from "react";
import LegalConsentNotice from "@/components/content/LegalConsentNotice";
import { useCheckinSubmit } from "@/hooks/checkin";
import { useTurnstile } from "@/hooks/useTurnstile";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { usePrivacyConsent } from "@/components/layout/PrivacyConsentGate";

export default function CheckinForm() {
  const { ensureConsent } = usePrivacyConsent();
  const [code, setCode] = useState("");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mutation = useCheckinSubmit();
  const { mountRef: turnstileMount, getToken: turnstileGetToken } = useTurnstile();
  const {
    fileRef: fileInputRef,
    photo,
    processing: processingPhoto,
    handleFile,
    clearPhoto,
  } = usePhotoUpload({ onError: setError });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!(await ensureConsent())) return;
    setError(null);
    if (code.replace(/\D/g, "").length !== 6) {
      setError("Tu código es el número de 6 dígitos que recibiste al registrarte.");
      return;
    }
    if (!place.trim()) {
      setError("Indica el lugar: centro de acopio, refugio o punto de entrega.");
      return;
    }
    try {
      await mutation.mutateAsync({
        code: code.trim(),
        place: place.trim(),
        note: note.trim() || undefined,
        photo,
        turnstileToken: await turnstileGetToken(),
      });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo registrar el check-in. Inténtalo de nuevo.",
      );
    }
  }

  if (done) {
    return (
      <div className="e-m-alert-success text-center" role="status">
        <span className="block text-lg font-bold">Check-in registrado</span>
        <span className="mt-1 block">
          Gracias: tu actividad quedó guardada con tu código. El equipo de
          coordinación ya puede verla en el panel.
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="checkin-code" className="mb-2 block text-sm font-semibold text-slate-900">
          Tu código de voluntario
        </label>
        <input
          id="checkin-code"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="483 920"
          maxLength={12}
          className="e-input w-44 font-mono text-lg tracking-[0.3em]"
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          Es el número de 6 dígitos que apareció al final de tu registro.
        </p>
      </div>

      <div>
        <label htmlFor="checkin-place" className="mb-2 block text-sm font-semibold text-slate-900">
          Lugar
        </label>
        <input
          id="checkin-place"
          type="text"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Centro de acopio, refugio o punto de entrega"
          maxLength={200}
          className="e-input w-full"
          required
        />
      </div>

      <div>
        <label htmlFor="checkin-note" className="mb-2 block text-sm font-semibold text-slate-900">
          ¿Qué dejaste o recogiste? (opcional)
        </label>
        <textarea
          id="checkin-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Ej.: dejé la caja 12 con agua en el estante B"
          className="e-input w-full resize-none"
        />
      </div>

      <div>
        <p className="mb-1 block text-sm font-semibold text-slate-900">
          Foto de evidencia (opcional)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
        <div className="flex items-center gap-3">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt="Vista previa"
              className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-lg bg-slate-100 text-2xl text-slate-400">
              📷
            </div>
          )}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processingPhoto}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {processingPhoto ? "Procesando…" : photo ? "Cambiar foto" : "Subir foto"}
            </button>
            {photo && (
              <button
                type="button"
                onClick={clearPhoto}
                className="text-xs text-slate-500 hover:text-red-600"
              >
                Quitar
              </button>
            )}
            <p className="text-[11px] text-slate-500">
              Una foto del lugar o de lo que dejaste ayuda a verificar.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div ref={turnstileMount} className="flex justify-center empty:hidden" />

      <LegalConsentNotice className="text-xs text-[var(--etext2)]" />

      <button
        type="submit"
        disabled={mutation.isPending || processingPhoto}
        className="e-m-btn e-m-btn--crisis e-m-btn--block disabled:opacity-60"
      >
        {mutation.isPending ? "Registrando…" : "Registrar check-in"}
      </button>
    </form>
  );
}
