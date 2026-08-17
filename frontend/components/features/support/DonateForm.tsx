"use client";

/**
 * Formulario de aporte económico: frecuencia, importe y salida a la pasarela.
 *
 * Lo que NO hace: pedir nombre, correo ni ningún dato personal. Quien cobra es
 * Stripe, y lo que necesite se lo pide en su propia página. Recoger aquí datos
 * que no vamos a usar sería crear un fichero de donantes por costumbre.
 *
 * El token de Turnstile va por envío, como en el resto de escrituras públicas:
 * el endpoint abre una sesión de pago con credencial de servicio, y sin la
 * verificación sería un generador de sesiones para cualquier bot.
 */
import { useState } from "react";
import DonateAmountField from "./DonateAmountField";
import { DONATE_COPY } from "./donate-copy";
import { useDonationCheckout } from "@/hooks/donations";
import { useTurnstile } from "@/hooks/useTurnstile";
import {
  DONATION_INTERVALS,
  INTERVAL_LABELS,
  MAX_DONATION_CENTS,
  MIN_DONATION_CENTS,
  parseAmountToCents,
  SUGGESTED_AMOUNTS_CENTS,
  type DonationInterval,
} from "@/lib/donation-amounts";

const DEFAULT_AMOUNT = SUGGESTED_AMOUNTS_CENTS[1];

function resolveAmount(selected: number | null, custom: string): number | null {
  if (selected !== null) return selected;
  const cents = parseAmountToCents(custom);
  if (cents === null || cents < MIN_DONATION_CENTS || cents > MAX_DONATION_CENTS) return null;
  return cents;
}

export default function DonateForm() {
  const [interval, setInterval] = useState<DonationInterval>("monthly");
  const [selected, setSelected] = useState<number | null>(DEFAULT_AMOUNT);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const checkout = useDonationCheckout();
  const { mountRef: turnstileMount, getToken: turnstileGetToken } = useTurnstile();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const amountCents = resolveAmount(selected, custom);
    if (amountCents === null) {
      setError("Escribe un importe entre 1 y 5.000 dólares.");
      return;
    }

    const turnstileToken = await turnstileGetToken();
    checkout.mutate(
      { amountCents, interval, turnstileToken },
      {
        onSuccess: (data) => {
          window.location.href = data.url;
        },
        onError: (err) => {
          setError(
            err instanceof Error
              ? err.message
              : "No pudimos abrir la pasarela de pago. Inténtalo de nuevo.",
          );
        },
      },
    );
  }

  const copy = DONATE_COPY[interval];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <header>
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[var(--brand-blue)]">
          {copy.eyebrow}
        </p>
        <h2 className="mt-1 text-[22px] font-bold leading-snug text-slate-900">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{copy.text}</p>
      </header>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Frecuencia del aporte">
        {DONATION_INTERVALS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={interval === option}
            onClick={() => setInterval(option)}
            className={`rounded-full px-4 py-2.5 text-sm font-bold transition-colors ${
              interval === option
                ? "bg-[var(--brand-blue)] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {INTERVAL_LABELS[option]}
          </button>
        ))}
      </div>

      <DonateAmountField
        selected={selected}
        custom={custom}
        onSelect={setSelected}
        onCustom={setCustom}
      />

      <div ref={turnstileMount} />

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={checkout.isPending}
        className="w-full rounded-full bg-[var(--brand-blue)] px-6 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-[var(--brand-blue-dark)] disabled:opacity-60"
      >
        {checkout.isPending ? "Abriendo el pago…" : "Dona ahora"}
      </button>

      <p className="text-center text-xs text-slate-500">
        El cobro lo procesa Stripe en su propia página segura. No vemos ni
        guardamos los datos de tu tarjeta.
      </p>
    </form>
  );
}
