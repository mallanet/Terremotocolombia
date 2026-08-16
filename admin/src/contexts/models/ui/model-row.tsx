"use client";

/**
 * Una fila de la tabla genérica: sus celdas, sus acciones y el formulario de
 * edición desplegado debajo. Extraído de model-table.tsx, donde el JSX de la
 * fila anidaba tanto que la tabla ya no se leía.
 */
import { Fragment } from "react";
import { Button } from "@/src/ui";
import { renderCell, StatusCell } from "./model-cell";
import { ModelForm } from "./model-form";
import type { ModelColumn, ModelConfig } from "../model-registry";
import type { ModelRow } from "../application/models-gateway";

export interface RowCallbacks {
  onPatch: (id: string, input: ModelRow) => void;
  onDelete: (id: string) => void;
  onEdit: (row: ModelRow | null) => void;
  onMessage: (row: ModelRow) => void;
  onAssign: (row: ModelRow) => void;
}

export interface RowAbilities {
  canEdit: boolean;
  canDelete: boolean;
  canMessage: boolean;
  canAssign: boolean;
  canEditStatus: boolean;
}

function Cell({
  path,
  row,
  column,
  canEditStatus,
  pending,
  onStatus,
}: {
  path: string;
  row: ModelRow;
  column: ModelColumn;
  canEditStatus: boolean;
  pending: boolean;
  onStatus: (status: string) => void;
}) {
  if (column.key !== "status") {
    return <td className="px-3 py-2 align-top">{renderCell(row[column.key])}</td>;
  }
  return (
    <td className="px-3 py-2 align-top">
      <StatusCell
        path={path}
        value={row[column.key]}
        editable={canEditStatus}
        pending={pending}
        onChange={onStatus}
      />
    </td>
  );
}

function Actions({
  row,
  abilities,
  callbacks,
}: {
  row: ModelRow;
  abilities: RowAbilities;
  callbacks: RowCallbacks;
}) {
  const id = renderCell(row.id);
  return (
    <td className="flex gap-2 px-3 py-2">
      {abilities.canEdit && (
        <Button type="button" variant="ghost" onClick={() => callbacks.onEdit(row)}>
          Editar
        </Button>
      )}
      {abilities.canMessage && (
        <Button type="button" variant="ghost" onClick={() => callbacks.onMessage(row)}>
          Contactar
        </Button>
      )}
      {abilities.canAssign && (
        <Button type="button" variant="ghost" onClick={() => callbacks.onAssign(row)}>
          Asignar
        </Button>
      )}
      {abilities.canDelete && (
        <Button type="button" variant="ghost" onClick={() => callbacks.onDelete(id)}>
          Eliminar
        </Button>
      )}
    </td>
  );
}

export function ModelRowView({
  model,
  row,
  abilities,
  callbacks,
  editing,
  pending,
}: {
  model: ModelConfig;
  row: ModelRow;
  abilities: RowAbilities;
  callbacks: RowCallbacks;
  editing: boolean;
  pending: boolean;
}) {
  const id = renderCell(row.id);
  const hasActions =
    abilities.canEdit || abilities.canDelete || abilities.canMessage || abilities.canAssign;
  const columnCount = model.columns.length + (hasActions ? 1 : 0);

  function saveEdit(input: ModelRow) {
    callbacks.onPatch(id, input);
  }

  function changeStatus(status: string) {
    callbacks.onPatch(id, { status });
  }

  return (
    <Fragment>
      <tr className="border-b border-border-soft last:border-0">
        {model.columns.map((column) => (
          <Cell
            key={column.key}
            path={model.path}
            row={row}
            column={column}
            canEditStatus={abilities.canEditStatus}
            pending={pending}
            onStatus={changeStatus}
          />
        ))}
        {hasActions && <Actions row={row} abilities={abilities} callbacks={callbacks} />}
      </tr>
      {editing && model.editFields && (
        <tr className="border-b border-border-soft bg-surface-muted last:border-0">
          <td colSpan={columnCount} className="px-3 py-3">
            <ModelForm
              fields={model.editFields}
              initial={row}
              submitLabel="Guardar"
              pending={pending}
              onCancel={() => callbacks.onEdit(null)}
              onSubmit={saveEdit}
            />
          </td>
        </tr>
      )}
    </Fragment>
  );
}
