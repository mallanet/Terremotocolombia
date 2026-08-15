"use client";

import { Button } from "@/src/ui";

export interface RowActionHandlers {
  onFicha?: () => void;
  onEdit?: () => void;
  onMessage?: () => void;
  onAssign?: () => void;
  onDelete?: () => void;
}

function GhostButton({ label, onClick }: { label: string; onClick?: () => void }) {
  if (!onClick) return null;
  return (
    <Button type="button" variant="ghost" onClick={onClick}>
      {label}
    </Button>
  );
}

export function RowActions(handlers: RowActionHandlers) {
  return (
    <td className="flex gap-2 px-3 py-2">
      <GhostButton label="Ficha" onClick={handlers.onFicha} />
      <GhostButton label="Editar" onClick={handlers.onEdit} />
      <GhostButton label="Contactar" onClick={handlers.onMessage} />
      <GhostButton label="Asignar" onClick={handlers.onAssign} />
      <GhostButton label="Eliminar" onClick={handlers.onDelete} />
    </td>
  );
}
