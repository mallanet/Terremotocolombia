"use client";

import { CAMPAIGN_MATERIALS, MATERIAL_KEYS, type MaterialKey } from "@/lib/campaign-materials";

export interface MaterialLineDraft {
  material: MaterialKey;
  quantity: string;
}

interface Props {
  lines: MaterialLineDraft[];
  onChange: (lines: MaterialLineDraft[]) => void;
  legend?: string;
}

export default function MaterialLinesField({
  lines,
  onChange,
  legend = "¿Qué vas a donar?",
}: Props) {
  function update(index: number, patch: Partial<MaterialLineDraft>) {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    onChange([...lines, { material: "cemento", quantity: "" }]);
  }

  function removeLine(index: number) {
    onChange(lines.filter((_, i) => i !== index));
  }

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 block text-sm font-medium text-slate-700">{legend}</legend>

      {lines.map((line, index) => (
        <div key={index} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[160px] flex-1">
            <label htmlFor={`material-${index}`} className="mb-1 block text-xs text-slate-500">
              Material
            </label>
            <select
              id={`material-${index}`}
              value={line.material}
              onChange={(e) => update(index, { material: e.target.value as MaterialKey })}
              className="e-input py-2.5"
            >
              {MATERIAL_KEYS.map((key) => (
                <option key={key} value={key}>
                  {CAMPAIGN_MATERIALS[key].label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-[140px]">
            <label htmlFor={`cantidad-${index}`} className="mb-1 block text-xs text-slate-500">
              Cantidad ({CAMPAIGN_MATERIALS[line.material].unit})
            </label>
            <input
              id={`cantidad-${index}`}
              type="number"
              min={1}
              max={100000}
              inputMode="numeric"
              value={line.quantity}
              onChange={(e) => update(index, { quantity: e.target.value })}
              required
              className="e-input py-2.5"
            />
          </div>

          {lines.length > 1 && (
            <button
              type="button"
              onClick={() => removeLine(index)}
              className="e-btn px-3 py-2.5 text-sm text-slate-600"
            >
              Quitar
            </button>
          )}
        </div>
      ))}

      {lines.length < 10 && (
        <button type="button" onClick={addLine} className="e-btn px-3 py-2 text-sm">
          Añadir otro material
        </button>
      )}
    </fieldset>
  );
}
