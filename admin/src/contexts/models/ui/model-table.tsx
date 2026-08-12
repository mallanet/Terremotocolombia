"use client";

import { Fragment, useMemo, useState, type FormEvent } from "react";
import { Button, Input } from "@/src/ui";
import { useModelList, useModelMutation } from "./use-model-list";
import type { ModelConfig, ModelField } from "../model-registry";
import type { ModelRow } from "../application/models-gateway";
import { useAdminSessionContext } from "../../../shared/auth/admin-session-context";
import { VolunteerMessageForm } from "../../volunteers/volunteer-message-form";
import { AssignTaskForm } from "../../volunteers/assign-task-form";

function renderCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "sí" : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Rótulos en español + color para los estados conocidos (voluntarios y sus
 * tareas). Así "¿ya se le envió?" se responde de un vistazo: Pendiente = aún
 * sin contactar; Contactado = ya se le envió correo.
 */
const STATUS_BADGES: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pendiente", classes: "bg-amber-100 text-amber-800" },
  contacted: { label: "Contactado", classes: "bg-blue-100 text-blue-800" },
  active: { label: "Activo", classes: "bg-green-100 text-green-800" },
  declined: { label: "Declinado", classes: "bg-gray-200 text-gray-600" },
  open: { label: "Abierta", classes: "bg-amber-100 text-amber-800" },
  assigned: { label: "Asignada", classes: "bg-blue-100 text-blue-800" },
  done: { label: "Terminada", classes: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelada", classes: "bg-gray-200 text-gray-600" },
  resolved: { label: "Resuelta", classes: "bg-green-100 text-green-800" },
  rejected: { label: "Rechazada", classes: "bg-red-100 text-red-700" },
};

/** Opciones del dropdown de estado por modelo (solo los que editan status). */
const STATUS_OPTIONS: Record<string, readonly string[]> = {
  volunteers: ["pending", "contacted", "active", "declined"],
  "volunteer-tasks": ["open", "assigned", "done", "cancelled"],
  "deletion-requests": ["pending", "resolved", "rejected"],
};

function statusBadge(value: unknown): { label: string; classes: string } | null {
  if (typeof value !== "string") return null;
  return STATUS_BADGES[value] ?? null;
}

function StatusBadge({ value }: { value: unknown }) {
  const badge = statusBadge(value);
  if (!badge) return <>{renderCell(value)}</>;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.classes}`}>
      {badge.label}
    </span>
  );
}

/**
 * Celda de estado: badge read-only, o <select> con pinta de badge cuando el
 * modelo edita status y el usuario puede editar — cambiar el estado es un
 * clic, sin abrir el formulario completo.
 */
function StatusCell({
  path,
  value,
  editable,
  pending,
  onChange,
}: {
  path: string;
  value: unknown;
  editable: boolean;
  pending: boolean;
  onChange: (status: string) => void;
}) {
  const options = STATUS_OPTIONS[path];
  const badge = statusBadge(value);
  if (!editable || !options) return <StatusBadge value={value} />;
  return (
    <select
      aria-label="Cambiar estado"
      className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        badge?.classes ?? "bg-gray-100 text-gray-700"
      }`}
      value={typeof value === "string" ? value : ""}
      disabled={pending}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {STATUS_BADGES[option]?.label ?? option}
        </option>
      ))}
    </select>
  );
}

function parseFieldValue(field: ModelField, value: unknown): unknown {
  if (field.type === "number") return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function matchesQuery(row: ModelRow, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return Object.values(row).some((v) => {
    if (renderCell(v).toLowerCase().includes(needle)) return true;
    const badge = statusBadge(v);
    return badge !== null && badge.label.toLowerCase().includes(needle);
  });
}

/**
 * Tabla read-only genérica para un modelo. Lee columnas del model-registry,
 * lista vía /api/models/<path>, con búsqueda client-side. F1: solo lectura.
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
  const canDelete = Boolean(model.canDelete && can(`${model.capabilityRoot}:delete`));
  // Acción de dominio única de volunteers: enviar correo desde el panel.
  const canMessage = model.path === "volunteers" && canEdit;
  // Acción de dominio única de volunteer-tasks: asignar a un voluntario.
  const canAssign = model.path === "volunteer-tasks" && canEdit;
  const hasActions = canEdit || canDelete || canMessage || canAssign;
  const canEditStatus =
    canEdit &&
    Boolean(model.editFields?.some((field) => field.key === "status")) &&
    Boolean(STATUS_OPTIONS[model.path]);

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
          onSubmit={(input) => mutation.mutate({ method: "POST", input })}
        />
      )}
      {mutation.error && <p className="text-sm text-red-600">{mutation.error.message}</p>}

      <div className="overflow-x-auto rounded-2xl border border-border-soft bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-soft bg-surface-muted text-left">
              {model.columns.map((c) => (
                <th key={c.key} className="px-3 py-2 font-semibold text-ink">
                  {c.label}
                </th>
              ))}
              {hasActions && <th className="px-3 py-2 font-semibold text-ink">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={model.columns.length + (hasActions ? 1 : 0)}
                  className="px-3 py-6 text-center text-ink-muted"
                >
                  Sin datos.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <Fragment key={renderCell(row.id) + String(i)}>
                  <tr className="border-b border-border-soft last:border-0">
                  {model.columns.map((c) => (
                    <td key={c.key} className="px-3 py-2 align-top">
                      {c.key === "status" ? (
                        <StatusCell
                          path={model.path}
                          value={row[c.key]}
                          editable={canEditStatus}
                          pending={mutation.isPending}
                          onChange={(status) =>
                            mutation.mutate({
                              method: "PATCH",
                              id: renderCell(row.id),
                              input: { status },
                            })
                          }
                        />
                      ) : (
                        renderCell(row[c.key])
                      )}
                    </td>
                  ))}
                  {hasActions && (
                    <td className="flex gap-2 px-3 py-2">
                      {canEdit && (
                        <Button type="button" variant="ghost" onClick={() => setEditing(row)}>
                          Editar
                        </Button>
                      )}
                      {canMessage && (
                        <Button type="button" variant="ghost" onClick={() => setMessaging(row)}>
                          Contactar
                        </Button>
                      )}
                      {canAssign && (
                        <Button type="button" variant="ghost" onClick={() => setAssigning(row)}>
                          Asignar
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            mutation.mutate({ method: "DELETE", id: renderCell(row.id) })
                          }
                        >
                          Eliminar
                        </Button>
                      )}
                    </td>
                  )}
                  </tr>
                  {editing === row && model.editFields && (
                    <tr className="border-b border-border-soft bg-surface-muted last:border-0">
                      <td
                        colSpan={model.columns.length + (hasActions ? 1 : 0)}
                        className="px-3 py-3"
                      >
                        <ModelForm
                          fields={model.editFields}
                          initial={editing}
                          submitLabel="Guardar"
                          pending={mutation.isPending}
                          onCancel={() => setEditing(null)}
                          onSubmit={(input) =>
                            mutation.mutate(
                              { method: "PATCH", id: renderCell(editing.id), input },
                              { onSuccess: () => setEditing(null) },
                            )
                          }
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
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

/**
 * <select> poblado con las filas de otro modelo del registro. Componente
 * propio para poder usar el hook de lista por instancia (uno por campo).
 * El value que viaja al backend es el `id`; la persona ve el nombre.
 */
function SelectModelField({
  field,
  value,
  onChange,
}: {
  field: ModelField;
  value: string;
  onChange: (next: string) => void;
}) {
  const { data, isLoading, isError } = useModelList(field.optionsModel ?? "");
  const labelKey = field.optionLabelKey ?? "name";

  // Si las opciones no cargan (p.ej. un rol con patient:create pero sin
  // hospital:read), degradar a entrada manual del ID: peor UX, pero el flujo
  // no queda BLOQUEADO. El backend valida el ID igual.
  if (isError) {
    return (
      <Input
        label={`${field.label} (ID — no se pudieron cargar las opciones)`}
        required={field.required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  // NUNCA disabled: un control deshabilitado queda FUERA de la validación
  // required de HTML5 y el submit pasaría con el campo vacío mientras carga.
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{field.label}</span>
      <select
        className="w-full rounded-lg border border-border-soft bg-white px-3 py-2"
        required={field.required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">
          {isLoading ? "Cargando opciones…" : `— Elige ${field.label.toLowerCase()} —`}
        </option>
        {(data ?? []).map((row) => (
          <option key={renderCell(row.id)} value={renderCell(row.id)}>
            {renderCell(row[labelKey])}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModelForm({
  fields,
  initial = {},
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  fields: readonly ModelField[];
  initial?: ModelRow;
  submitLabel: string;
  pending: boolean;
  onSubmit: (input: ModelRow) => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<ModelRow>(() =>
    Object.fromEntries(fields.map((field) => [field.key, initial[field.key] ?? ""])),
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    const input = Object.fromEntries(
      fields
        .filter((field) => values[field.key] !== "")
        .map((field) => [field.key, parseFieldValue(field, values[field.key])]),
    );
    onSubmit(input);
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-2xl border border-border-soft bg-white p-4 shadow-sm sm:grid-cols-2"
    >
      {fields.map((field) =>
        field.type === "select-model" ? (
          <SelectModelField
            key={field.key}
            field={field}
            value={renderCell(values[field.key]).replace("—", "")}
            onChange={(next) =>
              setValues((current) => ({ ...current, [field.key]: next }))
            }
          />
        ) : (
          <Input
            key={field.key}
            label={field.label}
            type={field.type ?? "text"}
            required={field.required}
            value={renderCell(values[field.key]).replace("—", "")}
            onChange={(event) =>
              setValues((current) => ({ ...current, [field.key]: event.target.value }))
            }
          />
        ),
      )}
      <div className="flex items-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
