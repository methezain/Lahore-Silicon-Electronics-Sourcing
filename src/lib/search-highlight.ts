/**
 * Highlight the characters of a command-palette query inside a label.
 * Separators in the query (space, hyphen, dot, slash) are not required in the label.
 */

import { normalizePartNumber } from "./catalog-search";

export type HighlightSpan = {
  text: string;
  hit: boolean;
};

function spans(text: string, start: number, end: number): HighlightSpan[] {
  const parts: HighlightSpan[] = [];
  if (start > 0) parts.push({ text: text.slice(0, start), hit: false });
  if (end > start) parts.push({ text: text.slice(start, end), hit: true });
  if (end < text.length) parts.push({ text: text.slice(end), hit: false });
  return parts.filter((part) => part.text.length > 0);
}

export function highlightMatch(text: string, query: string): HighlightSpan[] {
  if (!text) return [];
  const plain = [{ text, hit: false }];
  const needle = normalizePartNumber(query);
  if (!needle) return plain;

  const kept: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    if (!/[\s./\\\-]/.test(text[index])) kept.push(index);
  }
  const folded = kept.map((index) => text[index].toLowerCase()).join("");
  const at = folded.indexOf(needle);
  if (at >= 0) {
    const start = kept[at];
    const end = kept[at + needle.length - 1] + 1;
    if (start !== undefined && end > start) return spans(text, start, end);
  }

  const raw = query.trim().toLowerCase();
  if (!raw) return plain;
  const idx = text.toLowerCase().indexOf(raw);
  if (idx >= 0) return spans(text, idx, idx + raw.length);
  return plain;
}
