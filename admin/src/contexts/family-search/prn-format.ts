/**
 * Espejo cliente, en TS puro (sin DB, sin red), del codec de
 * `backend/src/lib/prn.ts:normalizePrn` — se reimplementa aquí (no se
 * importa del backend: paquetes separados) SOLO para detectar, ANTES de
 * llamar al BFF, un PRN "con forma de PRN" pero con un símbolo de control que
 * no cuadra (typo de transcripción). Sin este chequeo, el backend no puede
 * distinguir "formato inválido" de "PRN bien formado pero no registrado": un
 * PRN mal formado simplemente no normaliza, así que `searchRecords` lo trata
 * como una búsqueda de nombre normal (sin resultados, mismo response shape
 * que "no encontrado") — ver el informe de U11 para la nota completa de esta
 * deviation.
 *
 * Misma tolerancia que el original: mayúsculas/minúsculas, guiones/espacios
 * sobrantes, alias fonéticos I/L→1, O→0.
 */
const PRN_PREFIX = "TC";
const DATA_LENGTH = 8;
const DATA_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CHECK_EXTRA_SYMBOLS = "*~$=U";
const CHECK_ALPHABET = DATA_ALPHABET + CHECK_EXTRA_SYMBOLS;
const ALIASES: Record<string, string> = { I: "1", L: "1", O: "0" };

function computeCheckValue(data: string): number {
  const base = DATA_ALPHABET.length;
  const mod = CHECK_ALPHABET.length;
  let acc = 0;
  for (const symbol of data) {
    acc = (acc * base + DATA_ALPHABET.indexOf(symbol)) % mod;
  }
  return acc;
}

/** true si `input`, una vez despojado de espacios/guiones y puesto en
 *  mayúsculas, EMPIEZA como un PRN ("TC" + 9 símbolos más) — es decir, vale
 *  la pena tratarlo como un intento de PRN en vez de una búsqueda por nombre.
 *  No implica que sea válido (ver `normalizePrnClientSide`). */
export function looksLikePrn(input: string): boolean {
  const stripped = input.trim().toUpperCase().replace(/[\s-]/g, "");
  return stripped.startsWith(PRN_PREFIX) && stripped.length === PRN_PREFIX.length + DATA_LENGTH + 1;
}

/** Normaliza a la forma canónica `TC-XXXXXXXXC`, o `null` si la forma o el
 *  símbolo de control no cuadran. Solo tiene sentido llamarla cuando
 *  `looksLikePrn` ya dio true. */
export function normalizePrnClientSide(input: string): string | null {
  const stripped = input.trim().toUpperCase().replace(/[\s-]/g, "");
  if (!stripped.startsWith(PRN_PREFIX)) return null;

  const rest = stripped.slice(PRN_PREFIX.length);
  if (rest.length !== DATA_LENGTH + 1) return null;

  const aliased = rest.replace(/[ILO]/g, (symbol) => ALIASES[symbol] ?? symbol);
  const data = aliased.slice(0, DATA_LENGTH);
  const checkChar = aliased.slice(DATA_LENGTH);

  for (const symbol of data) {
    if (!DATA_ALPHABET.includes(symbol)) return null;
  }
  if (!CHECK_ALPHABET.includes(checkChar)) return null;
  if (checkChar !== CHECK_ALPHABET[computeCheckValue(data)]) return null;

  return `${PRN_PREFIX}-${data}${checkChar}`;
}
