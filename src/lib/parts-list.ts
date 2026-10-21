/**
 * Paste-a-parts-list. docs/commerce.md#search.
 * A line matches only an exact normalized part number or MPN.
 * A prefix is a different part, so it is a miss. Stock cuts use `correctQuantity`.
 */

import { exactPart } from "./catalog-search";
import { correctQuantity } from "./quantity";

export type PartsSource = {
  part_number: string;
  mpn: string;
  name: string;
  stock_qty: number;
  min_qty: number;
  qty_multiple: number;
  price?: number;
  image?: string;
  package_type?: string;
};

export type ParsedRequest = {
  /** 1-based line in the pasted text. */
  line: number;
  raw: string;
  query: string;
  quantity: number;
  /** True when the line named a quantity. A bare part number is 1, not explicit. */
  explicit: boolean;
};

export type PartsMatch = {
  part_number: string;
  name: string;
  price?: number;
  image?: string;
  package_type?: string;
  stock_qty: number;
  requested: number;
  quantity: number;
  message?: string;
};

export type PartsMiss = {
  line: number;
  raw: string;
  query: string;
};

export type PartsListResult = {
  matches: PartsMatch[];
  misses: PartsMiss[];
  parsed: ParsedRequest[];
};

const UNIT = String.raw`(?:pcs|pc|pieces|piece|nos|no|ea|qty)(?![a-z])`;
const QTY = String.raw`([1-9]\d*)`;

const HEADER_WORDS = new Set([
  "part",
  "parts",
  "number",
  "mpn",
  "sku",
  "item",
  "qty",
  "quantity",
  "description",
  "designator",
  "comment",
  "ref",
  "reference",
  "value",
]);

function cleanQuery(value: string): string {
  return value.replace(/^["']+|["']+$/g, "").replace(/\s+/g, " ").trim();
}

function okQuery(value: string): string | null {
  const query = cleanQuery(value);
  if (!query || !/[a-z]/i.test(query)) return null;
  return query;
}

function isHeader(line: string): boolean {
  const words = line.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  if (words.length === 0 || words.length > 4) return false;
  return words.every((word) => HEADER_WORDS.has(word));
}

function stripMarker(line: string): { body: string; indexQty?: number } {
  const bullet = /^[-*•–]\s+(.+)$/.exec(line);
  if (bullet?.[1]) return { body: bullet[1].trim() };
  const numbered = /^([1-9]\d*)[.)]\s+(.+)$/.exec(line);
  if (numbered?.[1] && numbered[2]) return { body: numbered[2].trim(), indexQty: Number(numbered[1]) };
  return { body: line };
}

type RawHit = { query: string; quantity: number };

function tryPatterns(input: string): RawHit | null {
  const line = input.trim();
  if (!line) return null;

  const patterns: RegExp[] = [
    new RegExp(`^${QTY}\\s*[x×*]\\s*(.+)$`, "i"),
    new RegExp(`^${QTY}\\s*${UNIT}\\s+(.+)$`, "i"),
    new RegExp(`^(.+?)(?:(?<=\\d)[x×*]\\s*|\\s+[x×*]\\s*)${QTY}\\s*(?:${UNIT})?\\s*$`, "i"),
    new RegExp(`^(.+?)\\s+qty\\s*:?\\s*${QTY}\\s*$`, "i"),
    new RegExp(`^(.+?)\\s*[\\[(]\\s*${QTY}\\s*(?:${UNIT})?\\s*[\\])]\\s*$`, "i"),
    new RegExp(`^${QTY}\\s*[,;\\t]\\s*([^,;\\t]+)$`, "i"),
    new RegExp(`^([^,;\\t]+?)\\s*[,;\\t]\\s*${QTY}\\s*(?:${UNIT})?\\s*$`, "i"),
    new RegExp(`^(.+?)\\s*:\\s*${QTY}\\s*(?:${UNIT})?\\s*$`, "i"),
    new RegExp(`^(.+?)\\s+[-–—]\\s+${QTY}\\s*(?:${UNIT})?\\s*$`, "i"),
    new RegExp(`^(.+?)\\s+${QTY}\\s*${UNIT}\\s*$`, "i"),
    new RegExp(`^(.+?[A-Za-z].*?)\\s+${QTY}\\s*$`, "i"),
    new RegExp(`^${QTY}\\s+(.+[A-Za-z].*)$`, "i"),
  ];

  const qtyFirst = new Set([0, 1, 5, 11]);

  for (let index = 0; index < patterns.length; index += 1) {
    const match = patterns[index].exec(line);
    if (!match) continue;
    const firstIsQty = qtyFirst.has(index);
    const query = okQuery(firstIsQty ? match[2] : match[1]);
    const quantity = Number(firstIsQty ? match[1] : match[2]);
    if (!query || !Number.isInteger(quantity) || quantity < 1) continue;
    return { query, quantity };
  }
  return null;
}

/** One request per non-empty line. Blank lines, comments, and column headers are dropped. */
export function parsePartsList(text: string): ParsedRequest[] {
  const requests: ParsedRequest[] = [];
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  lines.forEach((rawLine, index) => {
    const raw = rawLine.trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("//")) return;
    if (isHeader(raw)) return;
    const { body, indexQty } = stripMarker(raw);
    const hit = tryPatterns(body);
    if (hit) {
      requests.push({ line: index + 1, raw, query: hit.query, quantity: hit.quantity, explicit: true });
      return;
    }
    if (indexQty && /[a-z]/i.test(body)) {
      const query = cleanQuery(body);
      if (!query) return;
      requests.push({ line: index + 1, raw, query, quantity: indexQty, explicit: true });
      return;
    }
    const query = cleanQuery(body);
    if (!/[a-z]/i.test(query)) return;
    requests.push({ line: index + 1, raw, query, quantity: 1, explicit: false });
  });
  return requests;
}

/** A pasted BOM, not a single part-number search. */
export function looksLikePartsList(text: string): boolean {
  const parsed = parsePartsList(text);
  if (parsed.some((line) => line.explicit)) return true;
  return parsed.length >= 2;
}

export function resolveRequests(
  requests: readonly ParsedRequest[],
  parts: readonly PartsSource[],
): Pick<PartsListResult, "matches" | "misses"> {
  const misses: PartsMiss[] = [];
  const order: string[] = [];
  const buckets = new Map<string, { source: PartsSource; requested: number }>();

  for (const request of requests) {
    const found = exactPart(parts, request.query);
    if (!found) {
      misses.push({ line: request.line, raw: request.raw, query: request.query });
      continue;
    }
    const bucket = buckets.get(found.part_number);
    if (bucket) {
      bucket.requested += request.quantity;
      continue;
    }
    buckets.set(found.part_number, { source: found, requested: request.quantity });
    order.push(found.part_number);
  }

  const matches = order.map((key) => {
    const bucket = buckets.get(key);
    if (!bucket) throw new Error(`Missing bucket for ${key}`);
    const corrected = correctQuantity(bucket.requested, {
      min_qty: bucket.source.min_qty,
      qty_multiple: bucket.source.qty_multiple,
      stock_qty: bucket.source.stock_qty,
    });
    return {
      part_number: bucket.source.part_number,
      name: bucket.source.name,
      ...(bucket.source.price !== undefined ? { price: bucket.source.price } : {}),
      ...(bucket.source.image ? { image: bucket.source.image } : {}),
      ...(bucket.source.package_type ? { package_type: bucket.source.package_type } : {}),
      stock_qty: bucket.source.stock_qty,
      requested: bucket.requested,
      quantity: corrected.quantity,
      ...(corrected.message ? { message: corrected.message } : {}),
    };
  });

  return { matches, misses };
}

export function resolvePartsList(text: string, parts: readonly PartsSource[]): PartsListResult {
  const parsed = parsePartsList(text);
  return { parsed, ...resolveRequests(parsed, parts) };
}

/** Shown when `correctQuantity` changed the asked quantity. */
export function limitNote(match: Pick<PartsMatch, "part_number" | "quantity" | "message">): string | undefined {
  if (!match.message) return undefined;
  return `${match.part_number}: ${match.message}. Quantity set to ${match.quantity}.`;
}

export function previewSummary(result: Pick<PartsListResult, "matches" | "misses">): string {
  const matched = result.matches.length;
  const missed = result.misses.length;
  const limited = result.matches.filter((match) => match.message).length;
  const sentences = [
    matched === 0 ? "No parts match" : matched === 1 ? "1 part matches" : `${matched} parts match`,
  ];
  if (missed === 1) sentences.push("1 is not stocked");
  else if (missed > 1) sentences.push(`${missed} are not stocked`);
  if (limited === 1) sentences.push("1 quantity was set to the stock count");
  else if (limited > 1) sentences.push(`${limited} quantities were set to the stock count`);
  return `${sentences.join(". ")}.`;
}

export function addableMatches(result: Pick<PartsListResult, "matches">): PartsMatch[] {
  return result.matches.filter((match) => match.quantity > 0);
}

export function addLabel(count: number): string {
  if (count < 1) return "Nothing to add";
  return count === 1 ? "Add 1 part to cart" : `Add ${count} parts to cart`;
}
