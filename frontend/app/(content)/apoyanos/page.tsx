import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";
import SupportDonateCard from "@/components/features/support/SupportDonateCard";
import { webPageSchema } from "@/lib/jsonld";
import { SITE_BRAND_NAME } from "@/lib/site";

const APOYANOS_DESC =
  "Apoya con un aporte mensual el software que sostiene la respuesta al terremoto: mapa de rescate, búsqueda de personas, directorio de refugios y campaña de reconstrucción. Tu aporte paga la infraestructura y permite desplegarlo en la siguiente emergencia.";

/**
 * Imagen del banner. NO puede ser una foto de prensa ni mostrar personas
 * afectadas identificables (CLAUDE.md): esta es una ilustración de daño
 * estructural, sin personas, generada para esta página.
 */
const HERO_IMAGE = "/apoyanos/hero.jpg";

export const metadata: Metadata = pageMetadata({
  title: "Apóyanos",
  description: APOYANOS_DESC,
  path: "/apoyanos",
});

function HeroCopy() {
  return (
    <div className="text-white">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-white/80">
        Apóyanos · {SITE_BRAND_NAME}
      </p>
      {/* El blanco va en el h1, no solo heredado del contenedor: globals.css
          declara `h1 { color: var(--etext) }`, y un selector de elemento gana
          sobre el color heredado. Sin esto el titular sale oscuro sobre la
          foto y no se lee. */}
      <h1 className="mt-2 text-[30px] font-bold leading-tight text-white sm:text-[38px]">
        El software que busca personas no se sostiene solo
      </h1>
      <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-white/90 sm:text-base">
        Cuando tiembla, lo primero que falta es información: quién está
        desaparecido, qué hospital recibe, dónde hay un refugio abierto. Esta
        plataforma responde eso el mismo día, es abierta y ya está desplegada.
        Sostenerla cuesta dinero todos los meses, y llevarla a la próxima
        emergencia también.
      </p>
    </div>
  );
}

export default function ApoyanosPage() {
  return (
    <SubPageShell
      breadcrumb="Apóyanos"
      path="/apoyanos"
      extraSchema={[
        webPageSchema({
          path: "/apoyanos",
          name: "Apóyanos",
          description: APOYANOS_DESC,
        }),
      ]}
    >
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
        />
        <div aria-hidden className="absolute inset-0 bg-slate-950/62" />

        <div className="relative mx-auto grid w-full max-w-[1120px] items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-16">
          <HeroCopy />
          <SupportDonateCard />
        </div>
      </section>

      <section className="mx-auto w-full max-w-[720px] px-4 py-10 sm:px-6">
        <h2 className="text-xl font-bold text-slate-900">
          En qué se convierte tu aporte
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-700">
          No financia una sola campaña: financia que exista la herramienta. El
          mapa de rescate, la búsqueda de personas desaparecidas, el directorio
          de hospitales y refugios y la campaña de reconstrucción corren sobre
          la misma plataforma. Cada despliegue nuevo necesita dominio, base de
          datos, servidores y alguien que lo ponga en marcha mientras la tierra
          todavía se mueve.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-700">
          Si prefieres aportar a instituciones de emergencia en vez de a la
          plataforma, en{" "}
          <Link href="/donaciones" className="font-semibold text-[var(--brand-blue)] underline">
            donaciones
          </Link>{" "}
          están los canales oficiales verificados. Ahí no intermediamos: el
          aporte va directo a cada organización.
        </p>
      </section>
    </SubPageShell>
  );
}
