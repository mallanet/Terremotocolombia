"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import LegalConsentNotice from "@/components/content/LegalConsentNotice";
import { useVolunteerSubmit, type VolunteerInput } from "@/hooks/volunteers";
import { useTurnstile } from "@/hooks/useTurnstile";
import { usePrivacyConsent } from "@/components/layout/PrivacyConsentGate";
import {
  DetailsField,
  OfferTypePicker,
  PersonaBranch,
  toggleItem,
  type PatchBranch,
} from "./VolunteerBranches";
import { EMPTY_BRANCH, type BranchState } from "./volunteer-options";

function validateBranch(branch: BranchState): string | null {
  if (branch.offerTypes.length === 0) {
    return "Marca al menos una cosa que puedes ofrecer.";
  }
  if (branch.offerTypes.includes("persona")) {
    if (branch.personaMode === "") {
      return "Indica si quieres aportar de forma digital o en terreno.";
    }
    if (branch.personaMode === "digital") {
      if (branch.digitalSkills.length === 0) {
        return "Marca al menos una habilidad digital.";
      }
      if (branch.crisisExperience === "") {
        return "Indica si tienes experiencia previa en crisis.";
      }
    }
    if (branch.personaMode === "terreno") {
      if (!branch.fieldCity.trim()) {
        return "Indica la ciudad donde puedes presentarte.";
      }
      if (branch.rescueTraining === "") {
        return "Indica si tienes entrenamiento técnico en rescate.";
      }
      if (!branch.fieldRole) {
        return "Selecciona tu rol de interés en terreno.";
      }
      if (branch.ownVehicle === "") {
        return "Indica si cuentas con vehículo o equipo propio.";
      }
    }
  }
  return null;
}

export default function VolunteerForm() {
  const { ensureConsent } = usePrivacyConsent();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [zone, setZone] = useState("");
  const [availability, setAvailability] = useState("");
  const [branch, setBranch] = useState<BranchState>(EMPTY_BRANCH);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const volunteerMutation = useVolunteerSubmit();
  const submitting = volunteerMutation.isPending;
  const { mountRef: turnstileMount, getToken: turnstileGetToken } = useTurnstile();

  const patch: PatchBranch = (key, value) =>
    setBranch((prev) => ({ ...prev, [key]: value }));

  const showPersona = branch.offerTypes.includes("persona");
  const showDetails = branch.offerTypes.some((t) => t !== "persona");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Consentimiento ANTES de enviar datos personales (nombre + contacto). Si
    // la persona no acepta, no se envia nada. Ver PrivacyConsentGate.tsx.
    if (!(await ensureConsent())) return;
    setError(null);
    setSuccess(null);

    const branchError = validateBranch(branch);
    if (branchError) {
      setError(branchError);
      return;
    }

    const input: VolunteerInput = {
      name,
      contact,
      zone,
      availability,
      offerTypes: branch.offerTypes,
      offer: branch.offer.trim() || undefined,
      turnstileToken: await turnstileGetToken(),
    };
    if (showPersona && branch.personaMode === "digital") {
      input.digitalSkills = branch.digitalSkills;
      input.crisisExperience = branch.crisisExperience === "si";
    }
    if (showPersona && branch.personaMode === "terreno") {
      input.fieldCity = branch.fieldCity.trim();
      input.rescueTraining = branch.rescueTraining === "si";
      input.fieldRole = branch.fieldRole;
      input.ownVehicle = branch.ownVehicle === "si";
    }

    volunteerMutation.mutate(input, {
      onSuccess: (data) => {
        setSuccess(
          data.message ??
            "¡Gracias! Tu registro quedó guardado. Recibirás el mensaje de onboarding con los siguientes pasos. Conectar también salva vidas.",
        );
        setName("");
        setContact("");
        setZone("");
        setAvailability("");
        setBranch(EMPTY_BRANCH);
      },
      onError: (err) => {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo enviar el registro.",
        );
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <OfferTypePicker
        value={branch.offerTypes}
        onToggle={(t) =>
          patch("offerTypes", toggleItem(branch.offerTypes, t))
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-900">
            Nombre completo
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            maxLength={120}
            className="e-input w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="contact" className="mb-2 block text-sm font-semibold text-slate-900">
            WhatsApp o correo
          </label>
          <input
            type="text"
            id="contact"
            name="contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Ej. 300 000 0000 o tu@correo.com"
            maxLength={120}
            className="e-input w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="zone" className="mb-2 block text-sm font-semibold text-slate-900">
            Ciudad y país actual
          </label>
          <input
            type="text"
            id="zone"
            name="zone"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            placeholder="Ej. Bogotá, Colombia"
            maxLength={200}
            className="e-input w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="availability" className="mb-2 block text-sm font-semibold text-slate-900">
            Disponibilidad
          </label>
          <input
            type="text"
            id="availability"
            name="availability"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            placeholder="Ej. 10 horas por semana, o puntual"
            maxLength={120}
            className="e-input w-full"
            required
          />
        </div>
      </div>

      {showPersona && <PersonaBranch state={branch} patch={patch} />}
      {showDetails && <DetailsField state={branch} patch={patch} />}

      <p className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-[var(--brand-navy)]">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Al registrarte recibirás un mensaje de onboarding con los pasos a
          seguir: no dependes de coordinación en vivo para empezar a ayudar.
        </span>
      </p>

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
