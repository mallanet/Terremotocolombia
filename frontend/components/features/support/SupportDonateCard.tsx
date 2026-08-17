import { HeartHandshake, Repeat, ShieldCheck } from "lucide-react";
import Link from "next/link";
import {
  CONTACT_EMAIL,
  DONATION_MONTHLY_URL,
  DONATION_URL,
  SITE_BRAND_NAME,
} from "@/lib/site";

/**
 * Tarjeta de aporte, al estilo de las campañas de organizaciones grandes: la
 * suscripción primero, el aporte único como alternativa.
 *
 * Lo que NO hace, a propósito: prometer equivalencias ("tu aporte compra X").
 * No tenemos ese cálculo, y una cifra inventada en una página que pide dinero
 * es exactamente el tipo de promesa que destruye la confianza del proyecto.
 *
 * El importe tampoco se elige aquí. Los enlaces de pago de Stripe son productos
 * cerrados: único y recurrente son dos enlaces distintos, y la cantidad se
 * decide en su página. Pintar aquí unos botones de importe que Stripe luego
 * ignora sería mentir en la interfaz.
 */
const FUNDS = [
  "Servidores, base de datos y dominios de los despliegues que ya están en marcha.",
  "Levantar la plataforma en una emergencia nueva, en el país que sea, en cuestión de horas.",
  "Mantener el sistema vivo entre una emergencia y la siguiente, que es cuando nadie se acuerda de él.",
];

function MonthlyOption() {
  return (
    <a
      href={DONATION_MONTHLY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-blue)] px-6 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-[var(--brand-blue-dark)]"
    >
      <Repeat size={18} aria-hidden />
      Apoyar cada mes
    </a>
  );
}

function OneOffOption() {
  return (
    <a
      href={DONATION_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 px-6 py-3 text-[15px] font-semibold text-slate-800 transition-colors hover:bg-slate-50"
    >
      <HeartHandshake size={18} aria-hidden />
      Donar una sola vez
    </a>
  );
}

export default function SupportDonateCard() {
  return (
    <div className="w-full rounded-[24px] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.25)] sm:p-7">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-[var(--brand-blue)]">
        Apoyo recurrente
      </p>
      <h2 className="mt-1 text-[22px] font-bold leading-snug text-slate-900">
        Un aporte cada mes mantiene la plataforma en pie
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        La emergencia dura meses, no un fin de semana. Un aporte que se repite
        es lo que permite sostener el sistema sin depender de una campaña
        puntual.
      </p>

      <div className="mt-5 space-y-3">
        {DONATION_MONTHLY_URL && <MonthlyOption />}
        {DONATION_URL && <OneOffOption />}
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        Eliges el importe en la página de pago. Puedes cancelar el aporte
        mensual cuando quieras escribiendo a {CONTACT_EMAIL}.
      </p>

      <ul className="mt-5 space-y-2 border-t border-slate-200 pt-5 text-sm text-slate-700">
        {FUNDS.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="mt-1 text-[var(--brand-blue)]">
              •
            </span>
            {item}
          </li>
        ))}
      </ul>

      <p className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        <ShieldCheck size={16} aria-hidden className="mt-0.5 shrink-0 text-emerald-600" />
        <span>
          El cobro lo procesa Stripe. {SITE_BRAND_NAME} no ve ni guarda los
          datos de tu tarjeta.
        </span>
      </p>

      <p className="mt-4 text-center text-xs text-slate-500">
        ¿Prefieres donar material de construcción?{" "}
        <Link href="/reconstruccion" className="font-semibold text-[var(--brand-blue)] underline">
          Ver la campaña de reconstrucción
        </Link>
      </p>
    </div>
  );
}
