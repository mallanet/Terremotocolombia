"use client";

import { CHECKIN_AVAILABILITY } from "./checkin-copy";
import { FIELD_ROLES } from "@/components/features/volunteers/volunteer-options";

type CheckinStatusFieldsProps = {
  availability: string;
  talent: string;
  area: string;
  onAvailability: (value: string) => void;
  onTalent: (value: string) => void;
  onArea: (value: string) => void;
};

export function CheckinStatusFields({
  availability,
  talent,
  area,
  onAvailability,
  onTalent,
  onArea,
}: CheckinStatusFieldsProps) {
  return (
    <>
      <div>
        <label htmlFor="checkin-availability" className="mb-2 block text-sm font-semibold text-slate-900">
          Disponibilidad
        </label>
        <select
          id="checkin-availability"
          value={availability}
          onChange={(e) => onAvailability(e.target.value)}
          className="e-input w-full"
          required
        >
          <option value="">Elegir…</option>
          {CHECKIN_AVAILABILITY.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="checkin-talent" className="mb-2 block text-sm font-semibold text-slate-900">
          Talento
        </label>
        <select
          id="checkin-talent"
          value={talent}
          onChange={(e) => onTalent(e.target.value)}
          className="e-input w-full"
          required
        >
          <option value="">Elegir…</option>
          {FIELD_ROLES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="checkin-area" className="mb-2 block text-sm font-semibold text-slate-900">
          Área de acción
        </label>
        <input
          id="checkin-area"
          type="text"
          value={area}
          onChange={(e) => onArea(e.target.value)}
          placeholder="Municipio o zona donde puedes actuar"
          maxLength={200}
          className="e-input w-full"
          required
        />
      </div>
    </>
  );
}
