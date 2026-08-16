"use client";

import { useMemo, useState } from "react";
import { Input } from "@/src/ui";
import { useModelList, useModelMutation } from "./use-model-list";
import { hasStatusOptions, matchesQuery, renderCell } from "./model-cell";
import { ModelForm } from "./model-form";
import { ModelRowView } from "./model-row";
import { RevealOnce } from "./reveal-once";
import type { ModelConfig } from "../model-registry";
import type { ModelRow } from "../application/models-gateway";
import { useAdminSessionContext } from "../../../shared/auth/admin-session-context";
import { VolunteerMessageForm } from "../../volunteers/volunteer-message-form";
import { AssignTaskForm } from "../../volunteers/assign-task-form";

/**
 * Tabla genérica para un modelo. Lee columnas del model-registry, lista vía
 * /api/models/<path> y busca en cliente. Cómo se pinta cada celda vive en
 * model-cell.tsx, el formulario en model-form.tsx y la fila en model-row.tsx.
 */
export function ModelTable({ model }: { model: ModelConfig }) {
  const { data, isLoading, isError, error } = useModelList(model.path);
  const mutation = useModelMutation(model.path);
  const { can } = useAdminSessionContext();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ModelRow | null>(null);
  const [messaging, setMessaging] = useState<ModelRow | null>(null);
  const [assigning, setAssigning] = useState<ModelRow | null>(null);

  const canCreate = Boolean(model.createFields && can(`${model.capabilityRoot}:create`));
  const canEdit = Boolean(model.editFields && can(`${model.capabilityRoot}:edit`));
  const abilities = {
    canEdit,
    canDelete: Boolean(model.canDelete && can(`${model.capabilityRoot}:delete`)),
    // Acción de dominio única de volunteers: enviar correo desde el panel.
    canMessage: model.path === "volunteers" && canEdit,
    // Acción de dominio única de volunteer-tasks: asignar a un voluntario.
    canAssign: model.path === "volunteer-tasks" && canEdit,
    canEditStatus:
      canEdit &&
      Boolean(model.editFields?.some((field) => field.key === "status")) &&
      hasStatusOptions(model.path),
  };
  const hasActions =
    abilities.canEdit || abilities.canDelete || abilities.canMessage || abilities.canAssign;

  function patchRow(id: string, input: ModelRow) {
    mutation.mutate({ method: "PATCH", id, input }, { onSuccess: () => setEditing(null) });
  }

  function deleteRow(id: string) {
    mutation.mutate({ method: "DELETE", id });
  }

  function createRow(input: ModelRow) {
    mutation.mutate({ method: "POST", input });
  }

  const callbacks = {
    onPatch: patchRow,
    onDelete: deleteRow,
    onEdit: setEditing,
    onMessage: setMessaging,
    onAssign: setAssigning,
  };

  const rows = useMemo(
    () => (data ?? []).filter((r) => matchesQuery(r, query)),
    [data, query],
  );

  if (isLoading) return <p className="mt-4 text-sm text-ink-muted">Cargando {model.label}…</p>;
  if (isError) {
    return (
      <p role="alert" className="mt-4 text-sm text-red-600">
        Error al cargar {model.label}: {error instanceof Error ? error.message : "desconocido"}
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <Input
          label=""
          type="search"
          placeholder={`Buscar en ${model.label}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-sm text-ink-muted">{rows.length} resultado(s)</span>
      </div>

      {canCreate && (
        <ModelForm
          fields={model.createFields!}
          submitLabel="Crear"
          pending={mutation.isPending}
          onSubmit={createRow}
        />
      )}
      {mutation.error && <p className="text-sm text-red-600">{mutation.error.message}</p>}
      <RevealOnce fields={model.revealOnCreate} data={mutation.data} />

      <div className="overflow-x-auto rounded-2xl border border-border-soft bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-soft bg-surface-muted text-left">
              {model.columns.map((column) => (
                <th key={column.key} className="px-3 py-2 font-semibold text-ink">
                  {column.label}
                </th>
              ))}
              {hasActions && <th className="px-3 py-2 font-semibold text-ink">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={model.columns.length + (hasActions ? 1 : 0)}
                  className="px-3 py-6 text-center text-ink-muted"
                >
                  Sin datos.
                </td>
              </tr>
            )}
            {rows.map((row, index) => (
              <ModelRowView
                key={renderCell(row.id) + String(index)}
                model={model}
                row={row}
                abilities={abilities}
                callbacks={callbacks}
                editing={editing === row}
                pending={mutation.isPending}
              />
            ))}
          </tbody>
        </table>
      </div>

      {messaging && (
        <VolunteerMessageForm
          id={renderCell(messaging.id)}
          contact={renderCell(messaging.contact)}
          onClose={() => setMessaging(null)}
        />
      )}
      {assigning && (
        <AssignTaskForm
          taskId={renderCell(assigning.id)}
          taskTitle={renderCell(assigning.title)}
          onClose={() => setAssigning(null)}
        />
      )}
    </div>
  );
}
