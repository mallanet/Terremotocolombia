"use client";

/**
 * Pantalla del responsable de un punto de recolección. Todo lo que ve sale del
 * token de su enlace: su punto, lo que le anunciaron y lo que ya confirmó.
 */
import ReceiptForm from "./ReceiptForm";
import { useStewardInbox, type StewardPending } from "@/hooks/campaign";
import { materialLabel } from "@/lib/campaign-materials";

function itemsText(items: Array<{ material: string; quantity: number }>): string {
  return items.map((item) => `${item.quantity} ${materialLabel(item.material)}`).join(", ");
}

function PendingRow({ pledge }: { pledge: StewardPending }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 rounded-[12px] bg-slate-50 px-4 py-3">
      <span className="font-mono text-sm font-semibold tracking-widest text-slate-900">
        {pledge.code}
      </span>
      <span className="text-sm text-slate-700">{itemsText(pledge.items)}</span>
      <span className="text-xs text-slate-500">{pledge.donorName}</span>
    </li>
  );
}

export default function StewardView({ token }: { token: string }) {
  const { data, isLoading, isError, error } = useStewardInbox(token);

  if (isLoading) return <p className="text-sm text-slate-600">Cargando tu punto…</p>;
  if (isError) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {error instanceof Error ? error.message : "No se pudo cargar tu punto."}
      </p>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[24px] font-bold text-slate-900">{data.site.name}</h1>
        <p className="text-sm text-slate-600">
          {data.site.city} · {data.steward.displayName}
        </p>
      </header>

      <ReceiptForm token={token} />

      <section>
        <h2 className="mb-2 text-lg font-bold text-slate-900">
          Anunciado, todavía sin llegar ({data.pending.length})
        </h2>
        {data.pending.length === 0 ? (
          <p className="text-sm text-slate-600">Nadie tiene una entrega pendiente en tu punto.</p>
        ) : (
          <ul className="space-y-2">
            {data.pending.map((pledge) => (
              <PendingRow key={pledge.code} pledge={pledge} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-slate-900">Últimas entregas confirmadas</h2>
        {data.recent.length === 0 ? (
          <p className="text-sm text-slate-600">Todavía no has confirmado ninguna entrega.</p>
        ) : (
          <ul className="space-y-2">
            {data.recent.map((entry) => (
              <li key={entry.id} className="rounded-[12px] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <p className="text-sm text-slate-800">{itemsText(entry.items)}</p>
                {entry.note && <p className="text-xs text-slate-500">{entry.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
