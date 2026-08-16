"use client";

/**
 * Valor que el alta devuelve una sola vez (hoy: el token del responsable de
 * punto). Se muestra en grande y se puede copiar, con el aviso de que no se
 * puede volver a consultar — la base solo guarda su hash.
 */
export function RevealOnce({
  fields,
  data,
}: {
  fields?: readonly string[];
  data: unknown;
}) {
  if (!fields || fields.length === 0 || !data || typeof data !== "object") return null;

  const row = data as Record<string, unknown>;
  const revealed = fields
    .map((field) => [field, row[field]] as const)
    .filter(([, value]) => typeof value === "string" && value.length > 0);

  if (revealed.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">
        Guarda esto ahora: no se puede volver a consultar
      </p>
      {revealed.map(([field, value]) => (
        <p key={field} className="mt-2 select-all break-all font-mono text-sm text-amber-950">
          {String(value)}
        </p>
      ))}
      <p className="mt-2 text-xs text-amber-800">
        Envíaselo a la persona responsable por un canal privado. Con este enlace
        confirma las entregas de su punto.
      </p>
    </div>
  );
}
