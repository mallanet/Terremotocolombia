"use client";

import { useState } from "react";
import LegalConsentNotice from "@/components/content/LegalConsentNotice";
import { useVolunteerSubmit } from "@/hooks/volunteers";
import { useTurnstile } from "@/hooks/useTurnstile";
import { usePrivacyConsent } from "@/components/layout/PrivacyConsentGate";

export default function VolunteerForm() {
  const { ensureConsent } = usePrivacyConsent();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [offer, setOffer] = useState("");
  const [zone, setZone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const volunteerMutation = useVolunteerSubmit();
  const submitting = volunteerMutation.isPending;
  const { mountRef: turnstileMount, getToken: turnstileGetToken } = useTurnstile();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Consentimiento ANTES de enviar datos personales (nombre + teléfono). Si
    // la persona no acepta, no se envia nada. Ver PrivacyConsentGate.tsx.
    if (!(await ensureConsent())) return;
    setError(null);
    setSuccess(null);

    // Token FRESCO de Turnstile para este envío (se resetea tras leerlo).
    const turnstileToken = await turnstileGetToken();
    volunteerMutation.mutate(
      { name, phone, offer, zone, turnstileToken },
      {
        onSuccess: (data) => {
          setSuccess(
            data.message ??
              "Registro enviado. El equipo de coordinación se pondrá en contacto contigo pronto.",
          );
          setName("");
          setPhone("");
          setOffer("");
          setZone("");
        },
        onError: (err) => {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo enviar el registro.",
          );
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-900">
            Tu nombre
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre completo"
            maxLength={120}
            className="e-input w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-semibold text-slate-900">
            Teléfono de contacto
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0414-XXX-XXXX"
            maxLength={40}
            className="e-input w-full"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="offer" className="mb-2 block text-sm font-semibold text-slate-900">
          ¿Qué puedes ofrecer?
        </label>
        <textarea
          id="offer"
          name="offer"
          rows={3}
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          placeholder="Ej. Tengo camioneta disponible, soy médico, puedo llevar víveres, manejo de grúas..."
          maxLength={2000}
          className="e-input w-full resize-y"
          required
        />
      </div>

      <div>
        <label htmlFor="zone" className="mb-2 block text-sm font-semibold text-slate-900">
          Zona desde donde puedes ayudar
        </label>
        <input
          type="text"
          id="zone"
          name="zone"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          placeholder="Ej. Nombre del sector, ciudad"
          maxLength={200}
          className="e-input w-full"
          required
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p className="e-m-alert-success">
          {success}
        </p>
      )}

      <div ref={turnstileMount} className="flex justify-center empty:hidden" />

      <LegalConsentNotice className="text-xs text-[var(--etext2)]" />

      <button
        type="submit"
        disabled={submitting}
        className="e-m-btn e-m-btn--crisis e-m-btn--block mt-8 disabled:opacity-60"
      >
        {submitting ? "Enviando…" : "Enviar registro"}
      </button>
    </form>
  );
}
