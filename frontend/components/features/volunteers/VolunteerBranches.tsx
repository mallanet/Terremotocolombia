"use client";

import {
  HandCoins,
  HardHat,
  Laptop,
  Package,
  Tractor,
  TriangleAlert,
  Truck,
  Users,
} from "lucide-react";
import type { VolunteerOfferType } from "@/hooks/volunteers";
import {
  DIGITAL_SKILLS,
  FIELD_ROLES,
  OFFER_OPTIONS,
  type BranchState,
  type YesNo,
} from "./volunteer-options";

const OFFER_ICONS: Record<VolunteerOfferType, typeof Users> = {
  persona: Users,
  insumos: Package,
  dinero: HandCoins,
  maquinaria: Tractor,
  transporte: Truck,
};

export type PatchBranch = <K extends keyof BranchState>(
  key: K,
  value: BranchState[K],
) => void;

function toggleItem<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
}

function chipClass(active: boolean): string {
  return [
    "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "border-[var(--brand-blue)] bg-blue-50 text-[var(--brand-navy)]"
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
  ].join(" ");
}

function YesNoField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: YesNo;
  onChange: (v: YesNo) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-semibold text-slate-900">
        {label}
      </legend>
      <div className="flex gap-2" role="radiogroup" aria-labelledby={id}>
        {(["si", "no"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            aria-pressed={value === opt}
            onClick={() => onChange(opt)}
            className={chipClass(value === opt)}
          >
            {opt === "si" ? "Sí" : "No"}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function OfferTypePicker({
  value,
  onToggle,
}: {
  value: VolunteerOfferType[];
  onToggle: (t: VolunteerOfferType) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 block text-base font-bold text-slate-900">
        ¿Qué puedes ofrecer?
      </legend>
      <p className="mb-3 text-sm text-slate-500">
        Marca todo lo que aplique; solo te preguntaremos por lo que marques.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {OFFER_OPTIONS.map((opt) => {
          const Icon = OFFER_ICONS[opt.value];
          const active = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(opt.value)}
              className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors ${
                active
                  ? "border-[var(--brand-blue)] bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <Icon
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  active ? "text-[var(--brand-blue)]" : "text-slate-400"
                }`}
                aria-hidden
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  {opt.label}
                </span>
                <span className="block text-xs text-slate-500">{opt.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function DigitalBranch({
  state,
  patch,
}: {
  state: BranchState;
  patch: PatchBranch;
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div>
        <span className="mb-2 block text-sm font-semibold text-slate-900">
          Habilidad principal
        </span>
        <div className="flex flex-wrap gap-2">
          {DIGITAL_SKILLS.map((skill) => (
            <button
              key={skill}
              type="button"
              aria-pressed={state.digitalSkills.includes(skill)}
              onClick={() =>
                patch("digitalSkills", toggleItem(state.digitalSkills, skill))
              }
              className={chipClass(state.digitalSkills.includes(skill))}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>
      <YesNoField
        id="crisis-exp"
        label="¿Tienes experiencia previa en crisis?"
        value={state.crisisExperience}
        onChange={(v) => patch("crisisExperience", v)}
      />
    </div>
  );
}

function FieldBranch({
  state,
  patch,
}: {
  state: BranchState;
  patch: PatchBranch;
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div>
        <label
          htmlFor="fieldCity"
          className="mb-2 block text-sm font-semibold text-slate-900"
        >
          Ciudad donde puedes presentarte
        </label>
        <input
          type="text"
          id="fieldCity"
          name="fieldCity"
          value={state.fieldCity}
          onChange={(e) => patch("fieldCity", e.target.value)}
          placeholder="Ej. Quibdó, Medellín, Bogotá"
          maxLength={200}
          className="e-input w-full"
        />
      </div>

      <div>
        <YesNoField
          id="rescue-training"
          label="¿Tienes entrenamiento técnico en rescate?"
          value={state.rescueTraining}
          onChange={(v) => patch("rescueTraining", v)}
        />
        <p className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Sin entrenamiento técnico no es posible ingresar a zonas de
            escombros o estructuras dañadas. Es un tema de seguridad: el
            protocolo internacional (INSARAG) es consistente en esto.
          </span>
        </p>
      </div>

      <div>
        <label
          htmlFor="fieldRole"
          className="mb-2 block text-sm font-semibold text-slate-900"
        >
          Rol de interés
        </label>
        <select
          id="fieldRole"
          name="fieldRole"
          value={state.fieldRole}
          onChange={(e) => patch("fieldRole", e.target.value)}
          className="e-input w-full"
        >
          <option value="">Selecciona un rol…</option>
          {FIELD_ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      <YesNoField
        id="own-vehicle"
        label="¿Cuentas con vehículo o equipo propio?"
        value={state.ownVehicle}
        onChange={(v) => patch("ownVehicle", v)}
      />
    </div>
  );
}

export function PersonaBranch({
  state,
  patch,
}: {
  state: BranchState;
  patch: PatchBranch;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 block text-base font-bold text-slate-900">
        ¿Cómo quieres aportar?
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(
          [
            {
              mode: "digital" as const,
              icon: Laptop,
              title: "Voluntariado digital",
              hint: "Verificación, cruce de datos y difusión verificada. Sin requisito técnico previo.",
            },
            {
              mode: "terreno" as const,
              icon: HardHat,
              title: "Voluntariado en terreno",
              hint: "Acopio, logística, refugios. Requiere registro y, según el rol, capacitación breve.",
            },
          ]
        ).map(({ mode, icon: Icon, title, hint }) => {
          const active = state.personaMode === mode;
          return (
            <button
              key={mode}
              type="button"
              aria-pressed={active}
              onClick={() => patch("personaMode", mode)}
              className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors ${
                active
                  ? "border-[var(--brand-blue)] bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <Icon
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  active ? "text-[var(--brand-blue)]" : "text-slate-400"
                }`}
                aria-hidden
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  {title}
                </span>
                <span className="block text-xs text-slate-500">{hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      {state.personaMode === "digital" && (
        <DigitalBranch state={state} patch={patch} />
      )}
      {state.personaMode === "terreno" && (
        <FieldBranch state={state} patch={patch} />
      )}
    </fieldset>
  );
}

export function DetailsField({
  state,
  patch,
}: {
  state: BranchState;
  patch: PatchBranch;
}) {
  return (
    <div>
      <label
        htmlFor="offer"
        className="mb-2 block text-sm font-semibold text-slate-900"
      >
        Detalles de lo que ofreces
      </label>
      <textarea
        id="offer"
        name="offer"
        rows={3}
        value={state.offer}
        onChange={(e) => patch("offer", e.target.value)}
        placeholder="Ej. 20 cajas de agua embotellada, fondo para alimentación de brigadas, retroexcavadora con operador, camioneta disponible entre semana…"
        maxLength={2000}
        className="e-input w-full resize-y"
      />
    </div>
  );
}

export { toggleItem };
