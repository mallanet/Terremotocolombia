"use client";

import { Button } from "@/src/ui";
import { OFFER_TYPE_LABELS, fichaSections, type VolunteerRow } from "./ficha-fields";

export function VolunteerFicha({
  row,
  onClose,
}: {
  row: VolunteerRow;
  onClose: () => void;
}) {
  return (
    <div className="grid gap-4 rounded-2xl border border-border-soft bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">{String(row.name ?? "—")}</h2>
          <p className="text-sm text-ink-muted">
            Código {String(row.code ?? "—")} · {String(row.zone ?? "—")}
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cerrar ficha
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {fichaSections().map((section) => (
          <section key={section.title} className="grid gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {section.title}
            </h3>
            <dl className="grid gap-1 text-sm">
              {section.fields.map((field) => (
                <div key={field.key} className="grid grid-cols-[9rem_1fr] gap-2">
                  <dt className="text-ink-muted">{field.label}</dt>
                  <dd className="text-ink">{fichaValue(row[field.key], field.key)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}

function fichaValue(value: unknown, key: string): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "sí" : "no";
  if (Array.isArray(value)) {
    const items = value.map((item) =>
      key === "offerTypes" ? (OFFER_TYPE_LABELS[String(item)] ?? String(item)) : String(item),
    );
    return items.length > 0 ? items.join(", ") : "—";
  }
  if (key === "createdAt" || key === "updatedAt") {
    return new Date(Number(value)).toLocaleString("es-CO");
  }
  return String(value);
}
