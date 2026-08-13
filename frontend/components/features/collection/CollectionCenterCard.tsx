import type { ReactNode } from "react";
import type { CollectionCenter } from "@/hooks/acopio";
import CollectionCenterEditLink from "./CollectionCenterEditLink";

const CATEGORY_LABELS: Record<string, string> = {
  food: "Alimentos",
  water: "Agua",
  medicines: "Medicinas",
  medical_supplies: "Insumos médicos",
  clothing: "Ropa",
  shelter: "Refugio",
  hygiene: "Higiene",
  blankets: "Cobijas / colchonetas",
  blood: "Sangre",
  tools: "Herramientas de rescate",
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  saturated: { label: "Saturado", cls: "e-m-badge e-m-badge--warning" },
  paused: { label: "En pausa", cls: "e-m-badge e-m-badge--muted" },
  closed: { label: "Cerrado", cls: "e-m-badge e-m-badge--danger" },
};

function categoryLabel(key: string): string {
  return CATEGORY_LABELS[key] ?? key;
}

function locationLabel(center: CollectionCenter): string {
  return [center.city, center.country].filter(Boolean).join(" · ");
}

function verificationLabel(level: string): { text: string; official: boolean } {
  if (level === "official") return { text: "✓ Oficial", official: true };
  if (level === "citizen") return { text: "Ciudadano", official: false };
  return { text: "✓ Verificado", official: false };
}

function linkifyContact(text: string): ReactNode[] {
  return text.split(/(\s+)/).map((token, i) => {
    if (/^https?:\/\//i.test(token)) {
      return (
        <a key={i} href={token} target="_blank" rel="noopener noreferrer" className="e-m-link">
          {token}
        </a>
      );
    }
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(token)) {
      return (
        <a key={i} href={`mailto:${token}`} className="e-m-link">
          {token}
        </a>
      );
    }
    return <span key={i}>{token}</span>;
  });
}

export default function CollectionCenterCard({
  center,
}: {
  center: CollectionCenter;
}) {
  const status = STATUS_META[center.status];
  const verification = verificationLabel(center.verificationLevel);
  return (
    <li className="e-m-center-card">
      <div className="flex items-start justify-between gap-2">
        <p className="e-m-center-card__location">
          {locationLabel(center) || "Ubicación no indicada"}
        </p>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <span
            className={
              verification.official
                ? "e-m-badge e-m-badge--official"
                : "e-m-badge e-m-badge--verified"
            }
          >
            {verification.text}
          </span>
          {status && <span className={status.cls}>{status.label}</span>}
        </div>
      </div>

      <h3 className="e-m-center-card__title">{center.name}</h3>
      {center.manager && <p className="e-m-center-card__meta">{center.manager}</p>}
      {center.address && (
        <p className="e-m-center-card__body">📍 {center.address}</p>
      )}
      {center.schedule && (
        <p className="e-m-center-card__meta" style={{ marginTop: 8 }}>
          🕐 {center.schedule}
        </p>
      )}
      {center.accepts.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p className="e-m-filter-label">Reciben</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {center.accepts.map((item) => (
              <li key={item} className="e-m-tag">
                {categoryLabel(item)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {center.description && (
        <p className="e-m-center-card__body mt-3 whitespace-pre-line">
          {center.description}
        </p>
      )}
      {center.contact && (
        <p className="e-m-center-card__meta mt-3 break-words">
          📞 {linkifyContact(center.contact)}
        </p>
      )}
      {center.disputed && (
        <p className="e-m-note e-m-note--warning mt-2">
          ⚠️ Información en revisión.
        </p>
      )}
      <CollectionCenterEditLink centerId={center.id} />
    </li>
  );
}

export { categoryLabel };
