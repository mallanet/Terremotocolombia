"use client";

/**
 * Confirmación de una entrega en el punto.
 *
 * El código es opcional a propósito: mucha gente va a llegar con material sin
 * haberse registrado antes, y perder esa donación por no tener dónde anotarla
 * sería absurdo. Con código, la entrega cierra el compromiso de esa persona y
 * valida su certificado; sin código, se anota igual y suma al inventario.
 */
import { useState } from "react";
import MaterialLinesField, { type MaterialLineDraft } from "./MaterialLinesField";
import { useStewardReceipt } from "@/hooks/campaign";

export default function ReceiptForm({ token }: { token: string }) {
  const [pledgeCode, setPledgeCode] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<MaterialLineDraft[]>([
    { material: "cemento", quantity: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const receipt = useStewardReceipt(token);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setDone(null);

    const items = lines
      .map((line) => ({ material: line.material, quantity: Number(line.quantity) }))
      .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);

    if (items.length === 0) {
      setError("Anota cuánto material recibiste.");
      return;
    }

    receipt.mutate(
      { pledgeCode: pledgeCode.trim() || undefined, items, note },
      {
        onSuccess: (data) => {
          setDone(data.message ?? "Entrega confirmada.");
          setPledgeCode("");
          setNote("");
          setLines([{ material: "cemento", quantity: "" }]);
        },
        onError: (err) =>
          setError(err instanceof Error ? err.message : "No se pudo confirmar la entrega."),
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[20px] bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)]"
    >
      <h2 className="text-lg font-bold text-slate-900">Confirmar una entrega</h2>

      <div>
        <label htmlFor="recepcion-codigo" className="mb-1 block text-sm font-medium text-slate-700">
          Código de quien entrega (si lo trae)
        </label>
        <input
          id="recepcion-codigo"
          type="text"
          value={pledgeCode}
          onChange={(e) => setPledgeCode(e.target.value.toUpperCase())}
          maxLength={20}
          placeholder="Ej.: A2B3C4D5E6"
          className="e-input py-2.5 font-mono tracking-widest"
        />
        <p className="mt-1 text-xs text-slate-500">
          Sin código también se puede: la entrega se anota igual y suma al total
          del punto.
        </p>
      </div>

      <MaterialLinesField lines={lines} onChange={setLines} legend="¿Qué recibiste?" />

      <div>
        <label htmlFor="recepcion-nota" className="mb-1 block text-sm font-medium text-slate-700">
          Nota (opcional)
        </label>
        <input
          id="recepcion-nota"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="Ej.: llegó en camioneta, quedó en la bodega 2"
          className="e-input py-2.5"
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {done && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{done}</p>}

      <button
        type="submit"
        disabled={receipt.isPending}
        className="e-btn e-btn-primary px-5 py-3 disabled:opacity-60"
      >
        {receipt.isPending ? "Confirmando…" : "Confirmar entrega"}
      </button>
    </form>
  );
}
