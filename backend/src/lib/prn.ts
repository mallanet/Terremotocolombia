/**
 * Codec del PRN (Person Record Number) — U7, KTD7.
 *
 * Un PRN identifica UN REGISTRO fuente (no una persona: la persona es el
 * cluster que arma U9 sobre links confirmados). Formato: `TC-` + 8 símbolos
 * Crockford base32 + 1 símbolo de control (mod 37).
 *
 * Por qué Crockford y no UUID/base64: un PRN se dicta por teléfono, se
 * transcribe a mano en una libreta de un hospital, se lee desde una pantalla
 * pequeña. El alfabeto EXCLUYE I, L, O, U a propósito — I/L se confunden con 1
 * al oído y a la vista, O se confunde con 0 — así que quien transcribe no
 * necesita adivinar. `normalizePrn` acepta las cuatro formas ambiguas (I, L,
 * O tecleadas literalmente) y las resuelve al símbolo real, para que un typo
 * de transcripción razonable siga funcionando en vez de fallar en silencio.
 *
 * El símbolo de control (mod 37, sobre un alfabeto de 37 = 32 + 5 símbolos
 * reservados solo para el control: `* ~ $ = U`) detecta cualquier sustitución
 * de un solo símbolo: 37 es primo y mayor que la base (32), así que alterar
 * un solo símbolo del payload SIEMPRE cambia el valor mod 37 (nunca coincide
 * por casualidad). Es la misma garantía que un dígito verificador de cédula o
 * de tarjeta, aplicada a un identificador alfanumérico corto.
 *
 * Módulo puro: sin DB, sin colisiones que resolver aquí (eso es
 * responsabilidad de `services/person-records.ts`, que reintenta con un PRN
 * nuevo si `generatePrn()` choca contra la clave primaria de `person_records`
 * — astronómicamente improbable, pero KTD7 pide manejarlo).
 */

const PRN_PREFIX = "TC-";
const DATA_LENGTH = 8;

/** 32 símbolos Crockford base32 (0-9, A-Z sin I, L, O, U). Sin sesgo al
 *  mapear un byte aleatorio: 256 es múltiplo exacto de 32. */
const DATA_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** 5 símbolos reservados EXCLUSIVAMENTE para el carácter de control (spec de
 *  Crockford): nunca aparecen como símbolo de datos. */
const CHECK_EXTRA_SYMBOLS = "*~$=U";

/** 37 símbolos = alfabeto de datos + los 5 extra. mod 37 (primo, > base 32)
 *  es lo que garantiza que un solo símbolo alterado nunca cuela. */
const CHECK_ALPHABET = DATA_ALPHABET + CHECK_EXTRA_SYMBOLS;

/** Alias fonéticos: lo que alguien podría teclear al transcribir de oído. */
const ALIASES: Record<string, string> = { I: "1", L: "1", O: "0" };

/**
 * Valor de control (0-36) de una cadena de 8 símbolos de datos, vía el
 * algoritmo de Horner en mod 37: se acumula tomando el módulo en CADA paso
 * (no al final), lo que da el mismo resultado que el valor completo mod 37
 * sin arriesgar overflow y sin depender del tamaño del payload.
 *
 * Precondición: cada carácter de `data` DEBE pertenecer a DATA_ALPHABET — los
 * dos llamadores (generatePrn, normalizePrn) lo garantizan antes de invocar
 * esta función.
 */
function computeCheckValue(data: string): number {
  const base = DATA_ALPHABET.length;
  const mod = CHECK_ALPHABET.length;
  let acc = 0;
  for (const symbol of data) {
    acc = (acc * base + DATA_ALPHABET.indexOf(symbol)) % mod;
  }
  return acc;
}

/**
 * Genera un PRN nuevo: 8 símbolos aleatorios (crypto, no Math.random) + su
 * carácter de control. No consulta la base — la unicidad real la garantiza
 * `person_records.prn` como PK, con reintento en el llamador ante colisión.
 */
export function generatePrn(): string {
  const bytes = new Uint8Array(DATA_LENGTH);
  crypto.getRandomValues(bytes);

  let data = "";
  for (const byte of bytes) {
    // 5 bits bajos (0-31): unbiased porque 256 / 32 = 8 exacto.
    data += DATA_ALPHABET[byte & 0b11111];
  }

  return `${PRN_PREFIX}${data}${CHECK_ALPHABET[computeCheckValue(data)]}`;
}

/**
 * Normaliza cualquier variante razonable de un PRN a su forma canónica
 * `TC-XXXXXXXXC`, o `null` si la entrada no es un PRN válido (forma
 * incorrecta O carácter de control que no cuadra).
 *
 * Tolera: mayúsculas/minúsculas, guiones ausentes o en otra posición,
 * espacios sobrantes, y los alias fonéticos I/L→1, O→0 en la parte de datos.
 * `U` NUNCA se alía (no representa ninguna ambigüedad real) y solo es válida
 * en la posición del carácter de control.
 */
export function normalizePrn(input: unknown): string | null {
  if (typeof input !== "string") return null;

  const stripped = input.toUpperCase().replace(/[\s-]/g, "");
  if (!stripped.startsWith("TC")) return null;

  const rest = stripped.slice(2);
  if (rest.length !== DATA_LENGTH + 1) return null;

  const aliased = rest.replace(/[ILO]/g, (symbol) => ALIASES[symbol] ?? symbol);
  const data = aliased.slice(0, DATA_LENGTH);
  const checkChar = aliased.slice(DATA_LENGTH);

  for (const symbol of data) {
    if (!DATA_ALPHABET.includes(symbol)) return null;
  }
  if (!CHECK_ALPHABET.includes(checkChar)) return null;
  if (checkChar !== CHECK_ALPHABET[computeCheckValue(data)]) return null;

  return `${PRN_PREFIX}${data}${checkChar}`;
}

/** true si `input` normaliza a un PRN válido — azúcar sobre `normalizePrn`. */
export function isValidPrn(input: unknown): boolean {
  return normalizePrn(input) !== null;
}
