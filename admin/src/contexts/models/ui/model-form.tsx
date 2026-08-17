"use client";

/**
 * Formulario genérico de alta y edición de un modelo, y el <select> que se
 * puebla con las filas de otro modelo del registro. Extraído de
 * model-table.tsx.
 */
import { useState, type FormEvent } from "react";
import { Button, Input } from "@/src/ui";
import { useModelList } from "./use-model-list";
import { parseFieldValue, renderCell } from "./model-cell";
import type { ModelField } from "../model-registry";
import type { ModelRow } from "../application/models-gateway";

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

export function ModelForm({
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
            onChange={(next) => setValues((current) => ({ ...current, [field.key]: next }))}
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
