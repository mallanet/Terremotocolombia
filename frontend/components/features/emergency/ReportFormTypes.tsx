"use client";

import { MAP_REPORT_TYPE_KEYS, REPORT_TYPES, type ReportType } from "@/lib/types";

type ReportFormTypesProps = {
  type: ReportType;
  onChange: (type: ReportType) => void;
};

function optionClass(active: boolean): string {
  if (active) return "flex cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2.5 transition shadow-sm";
  return "flex cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2.5 transition border-[var(--eborder)] bg-[var(--esurf)] hover:border-[var(--etext3)] hover:bg-[var(--esurf2)]";
}

function optionStyle(active: boolean, color: string) {
  if (!active) return undefined;
  return { borderColor: color, background: `${color}14` };
}

export function ReportFormTypes({ type, onChange }: ReportFormTypesProps) {
  return (
    <fieldset>
      <legend className="e-report-modal__label">Qué quieres publicar</legend>
      <div className="grid grid-cols-2 gap-2">
        {MAP_REPORT_TYPE_KEYS.map((key) => (
          <label
            key={key}
            data-track="report_type_selected"
            data-report-type={key}
            className={optionClass(type === key)}
            style={optionStyle(type === key, REPORT_TYPES[key].color)}
          >
            <input
              type="radio"
              name="type"
              value={key}
              checked={type === key}
              onChange={() => onChange(key)}
              className="sr-only"
            />
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-base text-white"
              style={{ background: REPORT_TYPES[key].color }}
              aria-hidden
            >
              {REPORT_TYPES[key].icon}
            </span>
            <span className="min-w-0 text-xs font-semibold leading-tight text-[var(--etext)]">
              {REPORT_TYPES[key].label}
            </span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--etext2)]">
        {REPORT_TYPES[type].description}
      </p>
    </fieldset>
  );
}
