import Link from "next/link";
import {
  OFFICIAL_QUICK_INTERNAL,
  OFFICIAL_QUICK_PHONES,
  OFFICIAL_QUICK_WEBS,
  telHref,
} from "@/lib/official-support-links";

const phoneClassName =
  "flex h-full flex-col items-start justify-center rounded-2xl border border-slate-200 bg-white px-3 py-3 transition-colors hover:border-[var(--m-blue-500)] hover:bg-[var(--m-blue-50)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--m-blue-500)]";

const webClassName =
  "flex h-full flex-col items-start justify-center rounded-2xl border border-[var(--m-blue-500)] bg-white px-4 py-3 text-left transition-colors hover:bg-[var(--m-blue-50)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--m-blue-500)]";

const internalClassName =
  "flex h-full flex-col items-start justify-center rounded-2xl bg-[var(--m-blue-600)] px-4 py-3 text-left text-white transition-colors hover:bg-[var(--m-blue-700)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--m-blue-500)]";

/**
 * Franja de accesos rápidos a líneas 1XY y portales oficiales.
 * Va encima del directorio por categorías en /apoyo-disponible.
 */
export default function OfficialQuickLinks() {
  return (
    <section
      aria-labelledby="apoyo-oficiales-heading"
      className="mb-10 rounded-[24px] border border-slate-200 bg-slate-50 p-5 sm:p-6"
    >
      <div className="mb-5 max-w-2xl">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--m-blue-600)]">
          Fuentes oficiales
        </p>
        <h2
          id="apoyo-oficiales-heading"
          className="text-lg font-bold text-slate-900 sm:text-xl"
        >
          Accesos rápidos
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Líneas nacionales 1XY y portales del Estado. En peligro inmediato
          llama al{" "}
          <a href="tel:123" className="font-semibold text-[var(--ebuscar-ic)]">
            123
          </a>
          . Este sitio no es un canal oficial de emergencia.
        </p>
      </div>

      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Llamar ahora
        </h3>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {OFFICIAL_QUICK_PHONES.map((item) => (
            <li key={item.id}>
              <a href={telHref(item.phone)} className={phoneClassName}>
                <span className="text-xl font-bold tabular-nums text-[var(--ebuscar-ic)]">
                  {item.label}
                </span>
                <span className="mt-0.5 text-[12px] leading-snug text-slate-500">
                  {item.hint}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Portales oficiales
        </h3>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {OFFICIAL_QUICK_WEBS.map((item) => (
            <li key={item.id}>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={webClassName}
              >
                <span className="font-semibold text-[var(--m-blue-700)]">
                  {item.label}
                </span>
                <span className="mt-0.5 text-[12px] leading-snug text-slate-500">
                  {item.hint} · nueva pestaña
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          En esta plataforma
        </h3>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {OFFICIAL_QUICK_INTERNAL.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className={internalClassName}>
                <span className="font-semibold">{item.label}</span>
                <span className="mt-0.5 text-[12px] leading-snug text-[var(--m-blue-100)]">
                  {item.hint}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
