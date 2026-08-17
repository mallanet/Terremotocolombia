import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";
import { HandCoins, Info, LifeBuoy } from "lucide-react";
import OfertasList from "./OfertasList";
import { webPageSchema } from "@/lib/jsonld";
import { DONATE_LINK, DONATION_URL, SITE_BRAND_NAME } from "@/lib/site";

const DONACIONES_DESC =
  "Dona a Mallanet.org, la organización que sostiene este sitio, o usa los canales oficiales de instituciones verificadas (Cruz Roja, ABACO, bancos de sangre).";

export const metadata: Metadata = pageMetadata({
  title: "Donaciones",
  description: DONACIONES_DESC,
  path: "/donaciones",
});

function MallanetDonateCta() {
  if (!DONATION_URL) return null;

  return (
    <a
      href={DONATE_LINK.href}
      target={DONATE_LINK.target}
      rel={DONATE_LINK.rel}
      aria-label={DONATE_LINK.aria}
      className="mb-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-blue)] px-6 py-3 text-[15px] font-bold text-white transition-colors hover:bg-[var(--brand-blue-dark)] sm:w-auto"
    >
      <HandCoins size={18} aria-hidden />
      {DONATE_LINK.label}
    </a>
  );
}

export default function DonacionesPage() {
  return (
    <SubPageShell
      breadcrumb="Donaciones"
      path="/donaciones"
      extraSchema={[
        webPageSchema({
          path: "/donaciones",
          name: "Donaciones",
          description: DONACIONES_DESC,
        }),
      ]}
    >
      <section className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6">
        <h1 className="mb-2 text-[28px] font-bold text-slate-900 sm:text-[32px]">Donaciones</h1>
        <p className="mb-4 text-[15px] text-slate-600 sm:text-base">
          Puedes aportar a {SITE_BRAND_NAME}, la organización que sostiene este
          sitio, o ir directo a los canales oficiales de instituciones
          verificadas. En esos canales no intermediamos: confirma siempre la
          emergencia activa en el sitio de cada organización antes de aportar.
        </p>

        <MallanetDonateCta />

        {/* Acceso directo para quien llega buscando ayuda y no a donar:
            lleva al directorio de apoyo mapeado (/apoyo-disponible).
            Full-width en mobile, compacto en desktop. */}
        <Link
          href="/apoyo-disponible"
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-5 py-2.5 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100 sm:inline-flex sm:w-auto"
        >
          <LifeBuoy size={16} aria-hidden />
          Necesito apoyo
        </Link>

        <div className="mb-10">
          <OfertasList />
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          <Info size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p>
            Dona solo en sitios oficiales (.org / .org.co / .gov.co). Evita
            recaudaciones solo en redes, GoFundMe no verificados o envíos P2P a
            particulares. Copia cuentas bancarias únicamente desde la página
            viva de la institución, nunca desde mensajes reenviados.
          </p>
        </div>
      </section>
    </SubPageShell>
  );
}
