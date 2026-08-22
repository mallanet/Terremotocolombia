import { SITE_BRAND_NAME } from "@/lib/site";
import CampaignIcon from "./CampaignIcon";

/**
 * Banner de la campaña. Reutiliza el marco del hero de la portada (.e-hero*)
 * pero pone su propia imagen aquí, en línea, en vez de en shell-layout.css:
 * ese archivo sirve a toda la casa y cambiar su fondo cambiaría también la
 * portada.
 *
 * La imagen NO puede ser una foto de prensa ni mostrar personas afectadas
 * identificables (CLAUDE.md). La actual es material de construcción, sin
 * personas, generada para este banner.
 */
const HERO_IMAGE = "/campana/hero.jpg";
export default function CampaignHero({
  receivedLabel,
}: {
  receivedLabel?: string;
}) {
  return (
    <header className="e-hero">
      <div className="e-hero__gradient">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
        />
        {/* Velo: sin él, el texto blanco se pierde sobre los sacos claros. */}
        <div aria-hidden className="absolute inset-0 bg-slate-950/62" />

        <div className="e-hero__inner">
          <p className="e-hero__eyebrow">
            Campaña de reconstrucción · {SITE_BRAND_NAME}
          </p>
          <h1 className="e-hero__title">
            Un saco de cemento también levanta una casa
          </h1>
          <p className="e-hero__subtitle">
            Recogemos material de construcción en varias ciudades y lo llevamos
            a las familias del Chocó que perdieron su vivienda. Registra lo que
            vas a donar, entrégalo en el punto de tu ciudad y sigue aquí mismo
            cuánto se ha recogido.
          </p>

          {receivedLabel && (
            <p className="mt-4 text-sm font-semibold text-white/90">
              {receivedLabel}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#registrar"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-bold text-slate-900 shadow-lg transition hover:bg-slate-100"
            >
              <CampaignIcon name="registrar" size={22} />
              Registrar mi donación
            </a>
            <a
              href="#puntos"
              className="inline-flex items-center gap-2 rounded-full border border-white/70 px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-white/10"
            >
              <CampaignIcon name="punto" size={22} />
              Ver los puntos de entrega
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
