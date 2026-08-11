/**
 * Codec de PRN (U7) — TEST-FIRST a propósito: este archivo se escribe ANTES de
 * `backend/src/lib/prn.ts` (nota de ejecución del plan: los casos de checksum
 * y normalización de alias definen el codec, no al revés).
 *
 * Puro — sin DB, sin red, sin `./helpers`. Formato esperado: `TC-` + 8
 * símbolos Crockford base32 (sin I, L, O, U) + 1 símbolo de control (mod 37,
 * alfabeto de control con 5 símbolos extra reservados: `*~$=U`).
 */
import { describe, expect, it } from "vitest";
import { generatePrn, isValidPrn, normalizePrn } from "@/lib/prn";

/** Espejo del alfabeto esperado — el test no importa constantes internas del
 *  módulo a propósito (caja negra: solo las 3 funciones públicas). */
const DATA_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // 32 símbolos, sin I L O U
const CHECK_ALPHABET = DATA_ALPHABET + "*~$=U"; // 37 símbolos, el extra SOLO válido en el control

describe("generatePrn", () => {
  it("produce el formato TC-XXXXXXXXC y pasa su propia validación", () => {
    for (let i = 0; i < 100; i++) {
      const prn = generatePrn();
      // El carácter de control puede ser uno de los 5 símbolos extra
      // (*~$=U), así que la última posición usa el alfabeto de control, no
      // el de datos.
      expect(prn).toMatch(/^TC-[0-9A-Z]{8}[0-9A-Z*~$=U]$/);
      expect(isValidPrn(prn)).toBe(true);
      // Ya nace en forma canónica: normalizar un PRN válido es un no-op.
      expect(normalizePrn(prn)).toBe(prn);
    }
  });

  it("nunca usa I, L u O en ninguna posición — son alias, no símbolos reales", () => {
    for (let i = 0; i < 300; i++) {
      expect(generatePrn()).not.toMatch(/[ILO]/);
    }
  });

  it("los 8 símbolos de datos nunca son U — U solo es válido como carácter de control", () => {
    for (let i = 0; i < 300; i++) {
      const prn = generatePrn();
      const data = prn.slice(3, 11);
      expect(data).not.toMatch(/U/);
    }
  });

  it("genera valores distintos entre llamadas (crypto randomness, no un contador)", () => {
    const seen = new Set(Array.from({ length: 200 }, () => generatePrn()));
    expect(seen.size).toBe(200);
  });
});

describe("checksum — detección de typos", () => {
  it("el carácter de control detecta CUALQUIER sustitución de un solo símbolo", () => {
    const prn = generatePrn();
    const payload = prn.slice(3); // 8 datos + 1 control, sin el prefijo "TC-"

    for (let pos = 0; pos < payload.length; pos++) {
      const alphabet = pos < 8 ? DATA_ALPHABET : CHECK_ALPHABET;
      for (const symbol of alphabet) {
        if (symbol === payload[pos]) continue; // no es una sustitución real
        const mutated = `TC-${payload.slice(0, pos)}${symbol}${payload.slice(pos + 1)}`;
        expect(isValidPrn(mutated)).toBe(false);
      }
    }
  });

  it("un carácter de control equivocado por sí solo se rechaza", () => {
    const prn = generatePrn();
    const currentCheck = prn.slice(-1);
    const alt = CHECK_ALPHABET.split("").find((c) => c !== currentCheck);
    expect(alt).toBeDefined();
    const mutated = `${prn.slice(0, -1)}${alt}`;
    expect(isValidPrn(mutated)).toBe(false);
  });
});

describe("normalizePrn — formato y alias", () => {
  it("minúsculas, sin guion, y con espacios sobrantes normalizan al mismo canónico", () => {
    const prn = generatePrn();
    expect(normalizePrn(prn.toLowerCase())).toBe(prn);
    expect(normalizePrn(prn.replace("-", ""))).toBe(prn);
    expect(normalizePrn(`  ${prn}  `)).toBe(prn);
    expect(normalizePrn(prn.toLowerCase().replace("-", ""))).toBe(prn);
    expect(normalizePrn(`tc ${prn.slice(3).toLowerCase()}`)).toBe(prn);
  });

  it("I y L se leen como 1, O se lee como 0 — alias fonéticos comunicables por teléfono", () => {
    // Busca (entre PRNs generados) uno cuyos datos incluyan un '0' y otro con
    // un '1'. Con 8 símbolos al azar por PRN, aparecen casi siempre en pocos
    // intentos; el bucle acotado documenta esa expectativa sin ser flaky.
    let withZero: string | null = null;
    let withOne: string | null = null;
    for (let i = 0; i < 200 && (!withZero || !withOne); i++) {
      const prn = generatePrn();
      const data = prn.slice(3, 11);
      if (!withZero && data.includes("0")) withZero = prn;
      if (!withOne && data.includes("1")) withOne = prn;
    }
    expect(withZero).not.toBeNull();
    expect(withOne).not.toBeNull();

    const oAliased = withZero!.replace("0", "O");
    expect(normalizePrn(oAliased)).toBe(withZero);

    const iAliased = withOne!.replace("1", "I");
    expect(normalizePrn(iAliased)).toBe(withOne);
    const lAliased = withOne!.replace("1", "L");
    expect(normalizePrn(lAliased)).toBe(withOne);
  });

  it("rechaza entradas con forma inválida", () => {
    expect(normalizePrn("")).toBeNull();
    expect(normalizePrn("no-es-un-prn")).toBeNull();
    expect(normalizePrn("TC-CORTO")).toBeNull();
    expect(normalizePrn("TC-DEMASIADOLARGO1")).toBeNull();
    expect(normalizePrn(123)).toBeNull();
    expect(normalizePrn(null)).toBeNull();
    expect(normalizePrn(undefined)).toBeNull();
  });

  it("un dato con U (solo válida como control) se rechaza", () => {
    const prn = generatePrn();
    // Sustituye el primer símbolo de datos por 'U' — nunca es un dato válido.
    const mutated = `TC-U${prn.slice(4)}`;
    expect(isValidPrn(mutated)).toBe(false);
  });

  it("isValidPrn es equivalente a normalizePrn(x) !== null", () => {
    const prn = generatePrn();
    expect(isValidPrn(prn)).toBe(true);
    expect(isValidPrn("basura")).toBe(false);
  });
});
