import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Link from "next/link";
import type { ReactNode } from "react";
import SubPageShell from "@/components/layout/SubPageShell";
import OfficialQuickLinks from "@/components/features/support/OfficialQuickLinks";
import { PSYCH_HELP_FORM_URL } from "@/lib/psych-help-form";
import { telHref } from "@/lib/official-support-links";

export const metadata: Metadata = pageMetadata({
  title: "Apoyo disponible",
  description:
    "Directorio de apoyo durante la emergencia: líneas oficiales 1XY, portales del Estado, psicológico, civil y rescate, transporte, discapacidad, mascotas y más. Iniciativa ciudadana, independiente y no gubernamental.",
  path: "/apoyo-disponible",
});


function Card({
  emoji,
  iconClass,
  title,
  subtitle,
  children,
}: {
  emoji: string;
  iconClass: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] sm:p-7">
      <div className="mb-5 flex items-start gap-4">
        <span
          aria-hidden
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] text-2xl ${iconClass}`}
        >
          {emoji}
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-sm leading-snug text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3">{children}</div>
    </div>
  );
}

function ContactRow({
  label,
  sublabel,
  phone,
  stacked = false,
}: {
  label: string;
  sublabel: string;
  phone: string;
  stacked?: boolean;
}) {
  const number = (
    <a
      href={telHref(phone)}
      className="font-bold text-[var(--ebuscar-ic)] hover:underline"
    >
      {phone}
    </a>
  );
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      {stacked ? (
        <>
          <p className="font-bold text-slate-900">{label}</p>
          <p className="mb-2 text-[13px] text-slate-500">{sublabel}</p>
          <p className="text-[17px]">{number}</p>
        </>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-slate-900">{label}</p>
            <p className="text-[13px] text-slate-500">{sublabel}</p>
          </div>
          <span className="shrink-0 text-right">{number}</span>
        </div>
      )}
    </div>
  );
}

function ActionRow({
  label,
  sublabel,
  body,
  href,
  cta,
  filled = false,
  external = false,
}: {
  label?: string;
  sublabel?: string;
  body?: string;
  href: string;
  cta: string;
  filled?: boolean;
  external?: boolean;
}) {
  const className = filled
    ? "e-m-btn e-m-btn--crisis e-m-btn--block mt-4"
    : "e-m-btn e-m-btn--crisis mt-3";
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      {label ? <p className="font-bold text-slate-900">{label}</p> : null}
      {sublabel ? (
        <p className="text-[13px] text-slate-500">{sublabel}</p>
      ) : null}
      {body ? (
        <p className="text-sm leading-relaxed text-slate-600">{body}</p>
      ) : null}
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          {cta}
        </a>
      ) : (
        <Link href={href} className={className}>
          {cta}
        </Link>
      )}
    </div>
  );
}

/**
 * Directorio por tipo de apoyo + franja de accesos oficiales (1XY / .gov.co).
 * Las líneas cortas siguen `frontend/lib/emergency-contacts.ts`.
 */
export default function ApoyoPage() {
  return (
    <SubPageShell breadcrumb="Apoyo disponible" path="/apoyo-disponible">
      <section className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6">
        <h1 className="mb-2 text-[28px] font-bold text-slate-900 sm:text-[32px]">
          Apoyo disponible
        </h1>
        <p className="mb-8 text-[15px] text-slate-600 sm:text-base">
          Empieza por las líneas y portales oficiales, o elige el tipo de apoyo
          que necesitas más abajo.
        </p>

        <OfficialQuickLinks />

        <h2 className="mb-2 text-xl font-bold text-slate-900">
          Por tipo de apoyo
        </h2>
        <p className="mb-6 text-sm text-slate-600">
          Contactos y formularios por categoría. En emergencia llama al{" "}
          <a href="tel:123" className="font-semibold text-[var(--ebuscar-ic)]">
            123
          </a>
          .
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card
            emoji="🧠"
            iconClass="bg-amber-100"
            title="Psicológico"
            subtitle="Apoyo emocional y mental"
          >
            <ActionRow
              label="Red de salud mental"
              sublabel="Solicita apoyo psicológico o regístrate como profesional"
              href={PSYCH_HELP_FORM_URL}
              cta="Abrir formulario"
              external
              filled
            />
            <ContactRow
              label="Línea de ayuda e intervención en crisis"
              sublabel="Apoyo psicosocial · oficial"
              phone="106"
            />
            <ContactRow
              label="Cruz Roja Colombiana"
              sublabel="Orientación y respuesta humanitaria"
              phone="132"
            />
          </Card>

          <Card
            emoji="🦺"
            iconClass="bg-amber-100"
            title="Civil / Rescate"
            subtitle="Protección Civil y emergencias"
          >
            <ContactRow
              label="Número Único de Emergencias"
              sublabel="Línea nacional"
              phone="123"
            />
            <ContactRow
              label="Atención de desastres"
              sublabel="Línea nacional"
              phone="111"
            />
            <ContactRow
              label="Defensa Civil Colombiana"
              sublabel="Rescate y protección civil"
              phone="144"
            />
          </Card>

          <Card
            emoji="🚗"
            iconClass="bg-red-100"
            title="Transporte"
            subtitle="Traslado de personas y suministros"
          >
            <ContactRow
              label="Bomberos"
              sublabel="Traslado y emergencia"
              phone="119"
              stacked
            />
            <ContactRow
              label="Ambulancia"
              sublabel="Traslado sanitario"
              phone="125"
            />
            <ActionRow
              label="Voluntarios con vehículo"
              sublabel="Coordina en el espacio de voluntarios"
              href="/chat"
              cta="Ver chat"
            />
          </Card>

          <Card
            emoji="♿"
            iconClass="bg-violet-100"
            title="Discapacidad"
            subtitle="Apoyo especializado para personas con discapacidad"
          >
            <ActionRow
              body="En emergencia llama al 123 e indica si hay una persona con discapacidad. Para coordinar apoyo ciudadano, usa el espacio de voluntarios."
              href="/voluntario"
              cta="Espacio de voluntarios"
              filled
            />
            <ActionRow
              label="Directorio de teléfonos"
              sublabel="Líneas oficiales 1XY"
              href="/telefonos"
              cta="Ver teléfonos"
            />
          </Card>

          <Card
            emoji="🐾"
            iconClass="bg-[var(--m-blue-50)]"
            title="Mascotas"
            subtitle="Refugio y atención para animales"
          >
            <ActionRow
              body="Coordina rescate o refugio temporal de animales con la comunidad de voluntarios. En riesgo inmediato prioriza también al 123."
              href="/voluntario"
              cta="Espacio de voluntarios"
              filled
            />
            <ActionRow
              label="Reportar mascota"
              sublabel="Personas y animales en la plataforma"
              href="/mascotas"
              cta="Ir a mascotas"
            />
          </Card>

          <Card
            emoji="💬"
            iconClass="bg-slate-100"
            title="Otro tipo de apoyo"
            subtitle="No encuentras lo que buscas"
          >
            <ActionRow
              body="Coordina con otros voluntarios o reporta tu necesidad en el espacio comunitario."
              href="/voluntario"
              cta="Espacio de voluntarios"
              filled
            />
            <ActionRow
              label="Donaciones verificadas"
              sublabel="Canales oficiales (Cruz Roja, ABACO, bancos de sangre)"
              href="/donaciones"
              cta="Ver canales"
            />
          </Card>
        </div>
      </section>
    </SubPageShell>
  );
}
