"use client";

/**
 * Contadores públicos de la campaña.
 *
 * "Comprometido" y "recibido" se muestran SIEMPRE por separado y con etiquetas
 * que dicen lo que son. Sumarlos daría una cifra más lucida y más falsa: lo
 * único verificado es lo que un responsable confirmó en un punto.
 */
import { useCampaignBalance } from "@/hooks/campaign";
import { materialEmoji, type CampaignBalance, type MaterialTotal } from "@/lib/campaign-materials";

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("es-CO").format(Math.round(value));
}

function TotalsGrid({ totals, tone }: { totals: MaterialTotal[]; tone: string }) {
  if (totals.length === 0) {
    return <p className="text-sm text-slate-500">Sin registros todavía.</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {totals.map((total) => (
        <li key={total.material} className="rounded-[16px] bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <p className={`text-2xl font-bold ${tone}`}>
            {materialEmoji(total.material)} {formatQuantity(total.quantity)}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-700">{total.label}</p>
          <p className="text-xs text-slate-500">{total.unitLabel}</p>
        </li>
      ))}
    </ul>
  );
}

export default function BalanceBoard({ initial }: { initial?: CampaignBalance }) {
  const { data } = useCampaignBalance(initial);
  if (!data) return null;

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-1 text-lg font-bold text-slate-900">
          Recibido y verificado en los puntos
        </h3>
        <p className="mb-3 text-sm text-slate-600">
          Material que un responsable de punto confirmó al recibirlo. Es la
          única cifra que contamos como donación efectiva.
        </p>
        <TotalsGrid totals={data.received} tone="text-emerald-700" />
      </section>

      <section>
        <h3 className="mb-1 text-lg font-bold text-slate-900">
          Comprometido, aún sin entregar
        </h3>
        <p className="mb-3 text-sm text-slate-600">
          Personas y empresas que ya registraron su donación y la llevarán a un
          punto. Todavía no está en nuestras manos.
        </p>
        <TotalsGrid totals={data.pledgedPending} tone="text-slate-700" />
      </section>

      <section>
        <h3 className="mb-1 text-lg font-bold text-slate-900">En camino al Chocó</h3>
        <p className="mb-3 text-sm text-slate-600">
          Material que ya salió de un punto hacia la zona afectada.
        </p>
        <TotalsGrid totals={data.shipped} tone="text-[var(--ebuscar-ic)]" />
      </section>

      <p className="text-xs text-slate-500">
        {data.confirmedDonations === 1
          ? "1 donación confirmada"
          : `${data.confirmedDonations} donaciones confirmadas`}
        . Cifras actualizadas automáticamente cada minuto.
      </p>
    </div>
  );
}
