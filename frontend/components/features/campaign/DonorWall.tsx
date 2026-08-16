/**
 * Muro de quienes donan. Solo aparece quien marcó la casilla de publicación al
 * registrar su donación, y solo después de que su entrega quedó confirmada en
 * un punto. Sin ninguna de las dos cosas, no hay nombre que mostrar.
 */
export default function DonorWall({ names }: { names: string[] }) {
  if (names.length === 0) return null;

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-slate-900">Gracias a</h2>
      <p className="mb-5 max-w-[720px] text-sm text-slate-600">
        Personas y organizaciones que ya entregaron su material y pidieron
        aparecer aquí.
      </p>
      <ul className="flex flex-wrap gap-2">
        {names.map((name) => (
          <li
            key={name}
            className="rounded-full bg-white px-3 py-1.5 text-sm text-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}
