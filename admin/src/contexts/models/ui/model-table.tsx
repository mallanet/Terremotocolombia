"use client";

import { useMemo, useState } from "react";
import { Button, Input } from "@/src/ui";
import { useModelList, useModelMutation } from "./use-model-list";
import { useAdminSessionContext } from "../../../shared/auth/admin-session-context";
import { VolunteerMessageForm } from "../../volunteers/volunteer-message-form";
import { AssignTaskForm } from "../../volunteers/assign-task-form";
import { ModelRowView } from "./model-row";
import { ModelForm, STATUS_OPTIONS, matchesQuery, renderCell } from "./table-parts";
import type { ModelConfig, ModelRow } from "./table-parts";

export function ModelTable({ model }: { model: ModelConfig }) {
  const { data, isLoading, isError, error } = useModelList(model.path);
  const mutation = useModelMutation(model.path);
  const { can } = useAdminSessionContext();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ModelRow | null>(null);
  const [messaging, setMessaging] = useState<ModelRow | null>(null);
  const [assigning, setAssigning] = useState<ModelRow | null>(null);
  const [ficha, setFicha] = useState<ModelRow | null>(null);

  const canCreate = Boolean(model.createFields && can(`${model.capabilityRoot}:create`));
  const canEdit = Boolean(model.editFields && can(`${model.capabilityRoot}:edit`));
  const canDelete = Boolean(model.canDelete && can(`${model.capabilityRoot}:delete`));
  const isVolunteers = model.path === "volunteers";
  const canMessage = isVolunteers && canEdit;
  const canAssign = model.path === "volunteer-tasks" && canEdit;
  const hasActions = canEdit || canDelete || canMessage || canAssign || isVolunteers;
  const statusEditable =
    canEdit &&
    Boolean(model.editFields?.some((field) => field.key === "status")) &&
    Boolean(STATUS_OPTIONS[model.path]);
  const span = model.columns.length + (hasActions ? 1 : 0);

  const rows = useMemo(() => (data ?? []).filter((r) => matchesQuery(r, query)), [data, query]);

  function createRow(input: ModelRow) {
    mutation.mutate({ method: "POST", input });
  }

  function changeStatus(row: ModelRow, status: string) {
    const input = { status };
    mutation.mutate({ method: "PATCH", id: renderCell(row.id), input });
  }

  function saveEdit(input: ModelRow) {
    if (!editing) return;
    const id = renderCell(editing.id);
    mutation.mutate({ method: "PATCH", id, input }, { onSuccess: () => setEditing(null) });
  }

  function actionsFor(row: ModelRow) {
    if (!hasActions) return null;
    return {
      onFicha: isVolunteers ? () => setFicha(ficha === row ? null : row) : undefined,
      onEdit: canEdit ? () => setEditing(row) : undefined,
      onMessage: canMessage ? () => setMessaging(row) : undefined,
      onAssign: canAssign ? () => setAssigning(row) : undefined,
      onDelete: canDelete ? () => deleteRow(row) : undefined,
    };
  }

  function deleteRow(row: ModelRow) {
    mutation.mutate({ method: "DELETE", id: renderCell(row.id) });
  }

  if (isLoading) return <p className="mt-4 text-sm text-ink-muted">Cargando {model.label}…</p>;
  if (isError) {
    const detail = error instanceof Error ? error.message : "desconocido";
    return (
      <p role="alert" className="mt-4 text-sm text-red-600">
        Error al cargar {model.label}: {detail}
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
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-xs"
        />
        <span className="text-sm text-ink-muted">{rows.length} resultado(s)</span>
      </div>
      {canCreate ? (
        <ModelForm
          fields={model.createFields!}
          submitLabel="Crear"
          pending={mutation.isPending}
          onSubmit={createRow}
        />
      ) : null}
      {mutation.error ? <p className="text-sm text-red-600">{mutation.error.message}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-border-soft bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-soft bg-surface-muted text-left">
              {model.columns.map((column) => (
                <th key={column.key} className="px-3 py-2 font-semibold text-ink">
                  {column.label}
                </th>
              ))}
              {hasActions ? <th className="px-3 py-2 font-semibold text-ink">Acciones</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyRow span={span} /> : null}
            {rows.map((row, index) => (
              <ModelRowView
                key={renderCell(row.id) + String(index)}
                model={model}
                row={row}
                span={span}
                pending={mutation.isPending}
                statusEditable={statusEditable}
                fichaOpen={ficha === row}
                editOpen={editing === row}
                actions={actionsFor(row)}
                onStatus={(status) => changeStatus(row, status)}
                onCloseFicha={() => setFicha(null)}
                onCancelEdit={() => setEditing(null)}
                onSaveEdit={saveEdit}
              />
            ))}
          </tbody>
        </table>
      </div>
      {messaging ? (
        <VolunteerMessageForm
          id={renderCell(messaging.id)}
          contact={renderCell(messaging.contact)}
          onClose={() => setMessaging(null)}
        />
      ) : null}
      {assigning ? (
        <AssignTaskForm
          taskId={renderCell(assigning.id)}
          taskTitle={renderCell(assigning.title)}
          onClose={() => setAssigning(null)}
        />
      ) : null}
    </div>
  );
}

function EmptyRow({ span }: { span: number }) {
  return (
    <tr>
      <td colSpan={span} className="px-3 py-6 text-center text-ink-muted">
        Sin datos.
      </td>
    </tr>
  );
}
