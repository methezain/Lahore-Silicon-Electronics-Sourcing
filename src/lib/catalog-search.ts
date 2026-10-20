/**
 * Part lookup. docs/commerce.md#search.
 * Exact normalized part number or MPN, then prefix, then words and units.
 * A miss is empty. Nothing here substitutes a different part.
 */

export type SearchSpec = {
  value: string;
  unit?: string;
};

export type SearchPart = {
  part_number: string;
  mpn: string;
  name: string;
  summary?: string;
  category: string;
  voltage?: string;
  specs?: readonly SearchSpec[];
};

type Clause =
  | { kind: "word"; word: string }
  | { kind: "unit"; key: string; prefix: boolean };

type IndexedPart = {
  keys: string[];
  words: Set<string>;
  units: Set<string>;
};

/** Longer units first so `uf` wins over `u`, and `kohm` wins over `k`. */
const UNIT =
  "kohm|khz|mhz|hz|uf|nf|pf|uh|ma|ua|mv|kv|cm|mm|ohm|v|a|w|f|h|c|k|u";

const UNIT_RE = new RegExp(
  `(\\d+(?:\\.\\d+)?)(?:\\s*[–—-]\\s*(\\d+(?:\\.\\d+)?))?\\s*(${UNIT})(?![a-z0-9])`,
  "g",
);

/** Lowercase, then strip spaces, hyphens, dots and slashes. */
export function normalizePartNumber(value: string): string {
  return value.toLowerCase().replace(/[\s./\\\-]/g, "");
}

function prepare(text: string): string {
  return text.toLowerCase().replace(/[µμ]/g, "u").replace(/ω/g, "ohm");
}

function normalizeNumber(num: string): string {
  const [rawWhole, rawFrac] = num.split(".");
  const whole = rawWhole.replace(/^0+(?=\d)/, "") || "0";
  if (rawFrac === undefined) return whole;
  const frac = rawFrac.replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

/** `10` and `k` become `10000`. Decimal shift avoids binary float error. */
function scaleByThousand(num: string): string {
  const [whole, frac = ""] = normalizeNumber(num).split(".");
  if (!frac) return whole === "0" ? "0" : `${whole}000`;
  const digits = `${whole}${frac}`.replace(/^0+(?=\d)/, "") || "0";
  const shift = 3 - frac.length;
  if (shift >= 0) return `${digits}${"0".repeat(shift)}`;
  const cut = digits.length + shift;
  const head = digits.slice(0, Math.max(cut, 0)).replace(/^0+(?=\d)/, "") || "0";
  const tail = digits.slice(Math.max(cut, 0)).replace(/0+$/, "");
  return tail ? `${head}.${tail}` : head;
}

function unitKey(num: string, unit: string): string {
  const n = normalizeNumber(num);
  if (unit === "k" || unit === "kohm") return `${scaleByThousand(n)}ohm`;
  if (unit === "ohm") return `${n}ohm`;
  return `${n}${unit}`;
}

function pushWords(clauses: Clause[], chunk: string) {
  for (const token of chunk.split(/[^a-z0-9.]+/)) {
    const word = token.replace(/^\.+|\.+$/g, "");
    if (word) clauses.push({ kind: "word", word });
  }
}

/** One clause per unit expression. `5 V` and `5v` share a key. `10k` is ohms. `u` is `µ`. */
function clausesOf(text: string): Clause[] {
  const source = prepare(text);
  const clauses: Clause[] = [];
  const pattern = new RegExp(UNIT_RE.source, "g");
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    pushWords(clauses, source.slice(cursor, index));
    const unit = match[3];
    clauses.push({ kind: "unit", key: unitKey(match[1], unit), prefix: unit === "u" });
    if (match[2]) clauses.push({ kind: "unit", key: unitKey(match[2], unit), prefix: unit === "u" });
    cursor = index + match[0].length;
  }
  pushWords(clauses, source.slice(cursor));
  return clauses;
}

function absorb(indexed: IndexedPart, text: string | undefined) {
  if (!text) return;
  for (const clause of clausesOf(text)) {
    if (clause.kind === "word") indexed.words.add(clause.word);
    else indexed.units.add(clause.key);
  }
}

function indexPart(part: SearchPart): IndexedPart {
  const indexed: IndexedPart = {
    keys: [normalizePartNumber(part.part_number), normalizePartNumber(part.mpn)],
    words: new Set(),
    units: new Set(),
  };
  absorb(indexed, part.name);
  absorb(indexed, part.summary);
  absorb(indexed, part.category);
  absorb(indexed, part.voltage);
  for (const spec of part.specs ?? []) {
    absorb(indexed, spec.value);
    absorb(indexed, spec.unit ? `${spec.value} ${spec.unit}` : spec.value);
  }
  return indexed;
}

function wordHitsPartNumber(word: string, keys: readonly string[]): boolean {
  if (!/[a-z]/i.test(word)) return false;
  const needle = normalizePartNumber(word);
  if (needle.length < 2) return false;
  return keys.some((key) => key === needle || key.startsWith(needle));
}

function matchesClause(indexed: IndexedPart, clause: Clause): boolean {
  if (clause.kind === "word") {
    return indexed.words.has(clause.word) || wordHitsPartNumber(clause.word, indexed.keys);
  }
  if (indexed.units.has(clause.key)) return true;
  if (!clause.prefix) return false;
  for (const key of indexed.units) {
    if (key.startsWith(clause.key) && key.length > clause.key.length) return true;
  }
  return false;
}

/**
 * Rank: exact part number or MPN, then prefix, then every word and unit in the query.
 * Within a rank, catalog order is kept.
 */
export function searchCatalog<T extends SearchPart>(parts: readonly T[], query: string): T[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const needle = normalizePartNumber(trimmed);
  const clauses = clausesOf(trimmed);
  const exact: T[] = [];
  const prefix: T[] = [];
  const textual: T[] = [];

  for (const part of parts) {
    const indexed = indexPart(part);
    if (needle && indexed.keys.some((key) => key === needle)) {
      exact.push(part);
      continue;
    }
    if (needle.length >= 2 && indexed.keys.some((key) => key.startsWith(needle))) {
      prefix.push(part);
      continue;
    }
    if (clauses.length > 0 && clauses.every((clause) => matchesClause(indexed, clause))) {
      textual.push(part);
    }
  }

  return [...exact, ...prefix, ...textual];
}
