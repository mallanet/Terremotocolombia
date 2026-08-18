import {
  SITE_STATUS_LABELS,
  materialLabel,
  type CampaignSite,
} from "@/lib/campaign-materials";
import CampaignIcon from "./CampaignIcon";

const STATUS_CLASS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
  full: "bg-amber-50 text-amber-700",
  closed: "bg-slate-100 text-slate-500",
};

function groupByCity(sites: CampaignSite[]): Array<[string, CampaignSite[]]> {
  const cities = new Map<string, CampaignSite[]>();
  for (const site of sites) {
    cities.set(site.city, [...(cities.get(site.city) ?? []), site]);
  }
  return [...cities].sort((a, b) => a[0].localeCompare(b[0]));
}

function SiteCard({ site }: { site: CampaignSite }) {
  const statusLabel = SITE_STATUS_LABELS[site.status] ?? site.status;
  return (
    <article className="flex flex-col rounded-[20px] bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-slate-900">{site.name}</h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            STATUS_CLASS[site.status] ?? STATUS_CLASS.closed
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {site.address && (
        <p className="mt-1 flex items-start gap-2 text-sm text-slate-600">
          <CampaignIcon name="punto" size={16} />
          <span>{site.address}</span>
        </p>
      )}
      {site.schedule && (
        <p className="mt-1 flex items-start gap-2 text-sm text-slate-500">
          <CampaignIcon name="horario" size={16} />
          <span>{site.schedule}</span>
        </p>
      )}
      {site.contact && (
        <p className="mt-1 flex items-start gap-2 text-sm text-slate-500">
          <CampaignIcon name="contacto" size={16} />
          <span>{site.contact}</span>
        </p>
      )}

      {site.accepts.length > 0 && (
        <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
          <CampaignIcon name="material" size={16} />
          <span>Recibe: {site.accepts.map(materialLabel).join(", ")}</span>
        </p>
      )}

      {site.note && <p className="mt-3 text-sm text-slate-600">{site.note}</p>}
    </article>
  );
}

export default function SiteList({ sites }: { sites: CampaignSite[] }) {
  if (sites.length === 0) {
    return (
      <p className="rounded-[20px] bg-white p-6 text-sm text-slate-600 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        Todavía no hay puntos publicados. Estamos confirmando los espacios con
        las organizaciones aliadas de cada ciudad; en cuanto un punto esté
        confirmado aparece aquí con su dirección y horario.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {groupByCity(sites).map(([city, citySites]) => (
        <div key={city}>
          <h3 className="mb-3 text-lg font-bold text-slate-900">{city}</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {citySites.map((site) => (
              <SiteCard key={site.id} site={site} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
