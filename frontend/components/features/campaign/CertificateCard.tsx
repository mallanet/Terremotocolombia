import { materialEmoji, type CampaignCertificate } from "@/lib/campaign-materials";

/**
 * El certificado dice la verdad en los dos estados posibles.
 *
 * Mientras la entrega no esté confirmada por el punto, esto es un compromiso y
 * lo dice con todas las letras. Un papel que diga "donación verificada" antes
 * de que el material exista destruiría exactamente la confianza que la campaña
 * necesita.
 */
function formatDate(value: number | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(new Date(value));
}

export default function CertificateCard({
  certificate,
}: {
  certificate: CampaignCertificate;
}) {
  const confirmed = Boolean(certificate.confirmedAt);

  return (
    <article className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] print:shadow-none sm:p-8">
      <p
        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
          confirmed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        }`}
      >
        {confirmed ? "Entrega verificada" : "Compromiso registrado, entrega pendiente"}
      </p>

      <h1 className="mt-4 text-[26px] font-bold text-slate-900">
        Certificado de donación
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Campaña de reconstrucción · Terremoto Colombia
      </p>

      <dl className="mt-6 space-y-3 border-t border-slate-100 pt-6 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Código</dt>
          <dd className="font-mono font-semibold tracking-widest text-slate-900">
            {certificate.code}
          </dd>
        </div>
        {certificate.alias && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">A nombre de</dt>
            <dd className="font-semibold text-slate-900">{certificate.alias}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Registrado</dt>
          <dd className="text-slate-900">{formatDate(certificate.createdAt)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Entrega confirmada</dt>
          <dd className="text-slate-900">{formatDate(certificate.confirmedAt)}</dd>
        </div>
      </dl>

      <h2 className="mt-6 text-sm font-semibold text-slate-700">Material</h2>
      <ul className="mt-2 space-y-2">
        {certificate.items.map((item, index) => (
          <li
            key={`${item.material}-${index}`}
            className="flex items-baseline justify-between gap-4 rounded-[12px] bg-slate-50 px-4 py-3"
          >
            <span className="text-sm text-slate-700">
              {materialEmoji(item.material)} {item.label}
            </span>
            <span className="text-sm font-semibold text-slate-900">
              {item.quantity} {item.unitLabel}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
        Este certificado se puede verificar en cualquier momento entrando a
        terremotocolombia.co/reconstruccion/certificado/{certificate.code}. No
        sustituye ningún documento tributario.
      </p>
    </article>
  );
}
