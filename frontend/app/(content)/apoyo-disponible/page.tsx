import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";
import OfficialQuickLinks from "@/components/features/support/OfficialQuickLinks";
import {
  ActionRow,
  Card,
  ContactRow,
} from "@/components/features/support/ApoyoTypeCards";
import { PSYCH_HELP_FORM_URL, PSYCHOSOCIAL_NETWORK_FORM_URL } from "@/lib/psych-help-form";

export const metadata: Metadata = pageMetadata({
  title: "Apoyo disponible",
  description:
    "Directorio de apoyo durante la emergencia: líneas oficiales 1XY, portales del Estado, psicológico, psicosocial, civil y rescate, transporte, discapacidad, mascotas y más. Iniciativa ciudadana, independiente y no gubernamental.",
  path: "/apoyo-disponible",
});

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
            emoji="💛"
            iconClass="bg-yellow-100"
            title="Psicosocial"
            subtitle="Acompañamiento emocional comunitario"
          >
            <ActionRow
              label="Daniela · familias y cuidadores"
              sublabel="Lun a dom, hasta 10 h/semana. Contención inicial con niñas, niños y cuidadores. Preferible con un adulto responsable."
              href={PSYCHOSOCIAL_NETWORK_FORM_URL}
              cta="Pedir acompañamiento"
              external
              filled
            />
            <ActionRow
              label="Milly · primeros auxilios psicológicos"
              sublabel="Lun a vie, 14:00–17:00. Contención y crisis. No atiende a menores de edad."
              href={PSYCHOSOCIAL_NETWORK_FORM_URL}
              cta="Pedir acompañamiento"
              external
            />
            <ActionRow
              label="Leidy · orientación y psicoeducación"
              sublabel="Hasta el 17 ago, jornada completa; desde el 18, tardes. Escucha y autocuidado. No cubre riesgo suicida ni crisis psiquiátrica."
              href={PSYCHOSOCIAL_NETWORK_FORM_URL}
              cta="Pedir acompañamiento"
              external
            />
            <ContactRow
              label="Línea de ayuda e intervención en crisis"
              sublabel="Apoyo psicosocial · oficial"
              phone="106"
            />
          </Card>

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
