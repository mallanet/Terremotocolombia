"use client";

import Link from "next/link";

/**
 * El código es lo único que la persona necesita conservar: con él el
 * responsable del punto confirma la entrega y con él se consulta el
 * certificado. Por eso ocupa toda la pantalla del resultado, en grande y
 * seleccionable, en vez de perderse en una línea de texto.
 */
export default function PledgeSuccess({ code }: { code: string }) {
  return (
    <div className="rounded-[20px] bg-emerald-50 p-6 text-center">
      <p className="text-sm font-semibold text-emerald-800">
        Donación registrada
      </p>

      <p className="mt-4 text-xs uppercase tracking-wide text-emerald-700">
        Tu código
      </p>
      <p className="select-all font-mono text-3xl font-bold tracking-[0.2em] text-emerald-900">
        {code}
      </p>

      <p className="mx-auto mt-4 max-w-[420px] text-sm text-emerald-900">
        Guárdalo o hazle una foto. Cuando lleves el material al punto,
        muéstraselo a la persona responsable: con ese código confirma tu entrega
        y tu certificado queda válido.
      </p>

      <Link
        href={`/reconstruccion/certificado/${code}`}
        className="e-btn e-btn-primary mt-5 inline-block px-5 py-3"
      >
        Ver mi certificado
      </Link>
    </div>
  );
}
