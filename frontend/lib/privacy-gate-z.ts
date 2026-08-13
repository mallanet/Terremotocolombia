export const PRIVACY_GATE_Z_INDEX = 4000;
export const REPORT_MODAL_Z_INDEX = 2000;

export function privacyGateStacksAbove(reportModalZ: number): boolean {
  return PRIVACY_GATE_Z_INDEX > reportModalZ;
}
