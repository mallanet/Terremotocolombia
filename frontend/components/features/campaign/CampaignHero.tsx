import { SITE_BRAND_NAME } from "@/lib/site";

/**
 * Banner de la campaña. Reutiliza el hero de la portada (.e-hero*), que ya trae
 * el degradado oscuro y el velo sobre la imagen de fondo: la foto se cambia en
 * un solo sitio, styles/shell-layout.css, y cambia en toda la casa.
 *
 * La imagen NO puede ser una foto de prensa ni mostrar personas afectadas
 * identificables (CLAUDE.md). Hoy es el placeholder de marca.
 */
export default function CampaignHero({
  receivedLabel,
}: {
  receivedLabel?: string;
}) {
  return (
    <header className="e-hero">
      <div className="e-hero__gradient">
        <div className="e-hero__bg-image" aria-hidden />
        <div className="e-hero__bg-overlay" aria-hidden />

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
              className="rounded-full bg-white px-6 py-3 text-[15px] font-bold text-slate-900 shadow-lg transition hover:bg-slate-100"
            >
              Registrar mi donación
            </a>
            <a
              href="#puntos"
              className="rounded-full border border-white/70 px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-white/10"
            >
              Ver los puntos de entrega
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
