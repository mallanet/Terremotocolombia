"use client";

/**
 * Selector de importe: los sugeridos como botones y uno libre.
 *
 * Vive aparte del formulario para que ninguno de los dos crezca de más, y para
 * que el importe sea una sola pieza con un solo estado: `null` significa "otro
 * valor", y entonces manda lo que se escriba a mano.
 */
import {
  DONATION_CURRENCY_LABEL,
  formatAmount,
  SUGGESTED_AMOUNTS_CENTS,
} from "@/lib/donation-amounts";

const SELECTED = "border-[var(--brand-blue)] bg-[var(--brand-blue)] text-white";
const IDLE = "border-slate-300 bg-white text-slate-800 hover:border-slate-400";

export default function DonateAmountField({
  selected,
  custom,
  onSelect,
  onCustom,
}: {
  selected: number | null;
  custom: string;
  onSelect: (cents: number | null) => void;
  onCustom: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-slate-800">
        ¿Cuánto quieres aportar? ({DONATION_CURRENCY_LABEL})
      </legend>

      <div className="grid grid-cols-4 gap-2">
        {SUGGESTED_AMOUNTS_CENTS.map((cents) => (
          <button
            key={cents}
            type="button"
            aria-pressed={selected === cents}
            onClick={() => onSelect(cents)}
            className={`rounded-xl border px-2 py-3 text-[15px] font-bold transition-colors ${
              selected === cents ? SELECTED : IDLE
            }`}
          >
            {formatAmount(cents)}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={selected === null}
          onClick={() => onSelect(null)}
          className={`rounded-xl border px-2 py-3 text-[13px] font-semibold transition-colors ${
            selected === null ? SELECTED : IDLE
          }`}
        >
          Otro valor
        </button>
      </div>

      {selected === null && (
        <label className="mt-3 block">
          <span className="sr-only">Importe en dólares</span>
          <input
            type="number"
            inputMode="decimal"
            min="1"
            step="1"
            autoFocus
            value={custom}
            onChange={(event) => onCustom(event.target.value)}
            placeholder="Escribe el importe en dólares"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[15px] text-slate-900"
          />
        </label>
      )}
    </fieldset>
  );
}
