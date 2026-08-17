import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import SubPageShell from "@/components/layout/SubPageShell";
import { CONTACT_EMAIL, SITE_BRAND_NAME } from "@/lib/site";

/**
 * Página de agradecimiento: a donde Stripe devuelve el navegador al terminar.
 *
 * `noindex` a propósito. No es una página de destino, es el final de un
 * trámite, y no aporta nada en un buscador. Tampoco lee el `session_id` de la
 * URL ni consulta a Stripe: confirmar el cobro es trabajo del webhook, y
 * afirmar aquí "tu pago se completó" sin comprobarlo sería exactamente el tipo
 * de promesa que este proyecto no hace.
 */
export const metadata: Metadata = {
  title: "Gracias por tu aporte",
  robots: { index: false, follow: false },
};

export default function GraciasPage() {
  return (
    <SubPageShell breadcrumb="Gracias" path="/apoyanos/gracias">
      <section className="mx-auto w-full max-w-[640px] px-4 py-16 text-center sm:px-6">
        <CheckCircle2
          size={56}
          aria-hidden
          className="mx-auto text-emerald-600"
          strokeWidth={1.6}
        />
        <h1 className="mt-5 text-[28px] font-bold text-slate-900 sm:text-[32px]">
          Gracias por sostener esto
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-700">
          Stripe te enviará el recibo por correo. Si elegiste el aporte mensual,
          se repetirá cada mes hasta que lo canceles; para cancelarlo, o si algo
          no cuadra, escríbenos a {CONTACT_EMAIL} y lo resolvemos.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-700">
          Tu aporte paga la infraestructura de {SITE_BRAND_NAME} y hace posible
          levantar esta plataforma en la próxima emergencia.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-[var(--brand-blue)] px-6 py-3 text-[15px] font-bold text-white transition-colors hover:bg-[var(--brand-blue-dark)]"
          >
            Volver al inicio
          </Link>
          <Link
            href="/reconstruccion"
            className="rounded-full border border-slate-300 px-6 py-3 text-[15px] font-semibold text-slate-800 transition-colors hover:bg-slate-50"
          >
            Ver la campaña de reconstrucción
          </Link>
        </div>
      </section>
    </SubPageShell>
  );
}
