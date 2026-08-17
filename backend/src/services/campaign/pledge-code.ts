/**
 * Código del certificado: generación y normalización.
 *
 * Módulo puro, sin base de datos, para poder probarlo sin levantar entorno
 * (mismo motivo que services/patient-import-logic.ts).
 *
 * El alfabeto excluye los caracteres que se confunden al dictarlos por
 * teléfono o al leerlos de una foto tomada a contraluz en un punto de acopio:
 * nada de 0/O, ni 1/I/L.
 */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const PLEDGE_CODE_LENGTH = 10;

export function randomPledgeCode(): string {
  const bytes = new Uint8Array(PLEDGE_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return out;
}

export function normalizePledgeCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .slice(0, PLEDGE_CODE_LENGTH);
}
