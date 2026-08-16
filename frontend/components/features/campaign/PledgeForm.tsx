"use client";

/**
 * Registro del compromiso de donación.
 *
 * Mismo contrato que el resto de formularios públicos que escriben:
 * consentimiento explícito antes de enviar datos personales, token fresco de
 * Turnstile por envío, y la mutación por su hook. El muro público es opt-in:
 * la casilla nace desmarcada y sin ella no se guarda ningún alias.
 */
import { useState } from "react";
import LegalConsentNotice from "@/components/content/LegalConsentNotice";
import MaterialLinesField, { type MaterialLineDraft } from "./MaterialLinesField";
import PledgeSuccess from "./PledgeSuccess";
import { useCampaignPledge } from "@/hooks/campaign";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { useTurnstile } from "@/hooks/useTurnstile";
import { usePrivacyConsent } from "@/components/layout/PrivacyConsentGate";
import type { CampaignSite } from "@/lib/campaign-materials";

export default function PledgeForm({ sites }: { sites: CampaignSite[] }) {
  const { ensureConsent } = usePrivacyConsent();
  const [donorName, setDonorName] = useState("");
  const [donorContact, setDonorContact] = useState("");
  const [siteId, setSiteId] = useState("");
  const [note, setNote] = useState("");
  const [showInWall, setShowInWall] = useState(false);
  const [publicAlias, setPublicAlias] = useState("");
  const [lines, setLines] = useState<MaterialLineDraft[]>([
    { material: "cemento", quantity: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  const pledgeMutation = useCampaignPledge();
  const { mountRef: turnstileMount, getToken: turnstileGetToken } = useTurnstile();
  // El hook redibuja la imagen en un canvas antes de mandarla, lo que además
  // borra el EXIF (las coordenadas de dónde se tomó la foto, entre otras cosas).
  const { fileRef, photo, processing, handleFile, clearPhoto } = usePhotoUpload({
    onError: setError,
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!(await ensureConsent())) return;
    setError(null);

    const items = lines
      .map((line) => ({ material: line.material, quantity: Number(line.quantity) }))
      .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);

    if (items.length === 0) {
      setError("Indica cuánto vas a donar de al menos un material.");
      return;
    }

    const turnstileToken = await turnstileGetToken();
    pledgeMutation.mutate(
      {
        siteId: siteId || null,
        donorName,
        donorContact,
        showInWall,
        publicAlias: showInWall ? publicAlias || donorName : undefined,
        items,
        note,
        photo,
        turnstileToken,
      },
      {
        onSuccess: (data) => setCode(data.code),
        onError: (err) =>
          setError(
            err instanceof Error ? err.message : "No se pudo registrar tu donación.",
          ),
      },
    );
  }

  if (code) return <PledgeSuccess code={code} />;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="e-form2">
        <div>
          <label htmlFor="donante-nombre" className="mb-1 block text-sm font-medium text-slate-700">
            Tu nombre o el de tu empresa
          </label>
          <input
            id="donante-nombre"
            type="text"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            maxLength={120}
            required
            className="e-input py-2.5"
          />
        </div>
        <div>
          <label htmlFor="donante-contacto" className="mb-1 block text-sm font-medium text-slate-700">
            WhatsApp o correo
          </label>
          <input
            id="donante-contacto"
            type="text"
            value={donorContact}
            onChange={(e) => setDonorContact(e.target.value)}
            maxLength={120}
            required
            className="e-input py-2.5"
          />
        </div>
      </div>

      <div>
        <label htmlFor="donante-punto" className="mb-1 block text-sm font-medium text-slate-700">
          ¿En qué punto vas a entregarlo?
        </label>
        <select
          id="donante-punto"
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          className="e-input py-2.5"
        >
          <option value="">Todavía no lo sé</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.city} — {site.name}
            </option>
          ))}
        </select>
      </div>

      <MaterialLinesField lines={lines} onChange={setLines} />

      <div>
        <label htmlFor="donante-nota" className="mb-1 block text-sm font-medium text-slate-700">
          ¿Algo que debamos saber? (opcional)
        </label>
        <textarea
          id="donante-nota"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Ej.: lo llevo el sábado por la mañana, necesito ayuda para descargar…"
          className="e-input min-h-[80px] resize-y py-2.5"
        />
      </div>

      <div>
        <p className="mb-1 block text-sm font-medium text-slate-700">
          Foto del material (opcional)
        </p>
        <p className="mb-2 text-xs text-slate-500">
          Solo la ve el equipo de la campaña. No se publica en ningún lado.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          aria-label="Foto del material que vas a donar"
          className="text-sm"
        />
        {processing && <p className="mt-1 text-xs text-slate-500">Procesando la foto…</p>}
        {photo && (
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt="Vista previa de la foto"
              className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200"
            />
            <button
              type="button"
              onClick={clearPhoto}
              className="text-sm font-medium text-slate-600 underline"
            >
              Quitar
            </button>
          </div>
        )}
      </div>

      <div className="rounded-[16px] bg-slate-50 p-4">
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showInWall}
            onChange={(e) => setShowInWall(e.target.checked)}
            className="mt-1"
          />
          <span>
            Quiero aparecer en la lista pública de quienes donan. Si no marcas
            esta casilla, tu donación se cuenta en las cifras pero tu nombre no
            se publica en ningún lado.
          </span>
        </label>
        {showInWall && (
          <input
            type="text"
            value={publicAlias}
            onChange={(e) => setPublicAlias(e.target.value)}
            maxLength={80}
            placeholder="Nombre a mostrar (si lo dejas vacío usamos el de arriba)"
            aria-label="Nombre a mostrar en la lista pública"
            className="e-input mt-3 py-2.5"
          />
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div ref={turnstileMount} className="flex justify-center empty:hidden" />

      <LegalConsentNotice className="text-xs text-[var(--etext2)]" />

      <button
        type="submit"
        disabled={pledgeMutation.isPending}
        className="e-btn e-btn-primary px-5 py-3 disabled:opacity-60"
      >
        {pledgeMutation.isPending ? "Registrando…" : "Registrar mi donación"}
      </button>
    </form>
  );
}
