import { changesOf, type AdminDatabase } from "./db";
import { recordAuditStatement } from "./audit";
import { DEFAULT_LOW_STOCK_AT, stockLevel, type StockLevel } from "../stock";

export const QTY_MAX = 1_000_000;

export type StockRecord = { part_number: string; qty: number; restock_on: string | null };

export async function readStock(db: AdminDatabase): Promise<StockRecord[]> {
  const rows = await db.prepare("SELECT part_number, qty, restock_on FROM stock ORDER BY part_number").bind().all<StockRecord>();
  return rows.results;
}

export type StockEntry = {
  part_number: string;
  name: string;
  qty: number;
  restock_on: string | null;
  low_stock_at: number;
  published: boolean;
  level: StockLevel;
  image?: string;
};

const RANK: Record<StockLevel, number> = { out: 0, low: 1, ok: 2 };

type Described = { part_number: string; name: string; low_stock_at?: number; published: boolean; image?: string };

/** Live counts joined to product names. Low and out come first. */
export function stockEntries(records: readonly StockRecord[], products: readonly Described[]): StockEntry[] {
  const byPart = new Map(products.map((product) => [product.part_number, product]));
  const entries: StockEntry[] = [];
  for (const record of records) {
    const product = byPart.get(record.part_number);
    if (!product) continue;
    const low = product.low_stock_at ?? DEFAULT_LOW_STOCK_AT;
    entries.push({
      part_number: record.part_number,
      name: product.name,
      qty: record.qty,
      restock_on: record.restock_on,
      low_stock_at: low,
      published: product.published,
      level: stockLevel(record.qty, low),
      ...(product.image ? { image: product.image } : {}),
    });
  }
  return entries.sort((a, b) => RANK[a.level] - RANK[b.level] || a.qty - b.qty || a.part_number.localeCompare(b.part_number));
}

export function parseQty(value: string): number | null {
  const text = value.trim();
  if (!/^\d{1,7}$/.test(text)) return null;
  const qty = Number(text);
  return qty <= QTY_MAX ? qty : null;
}

/** An ISO calendar date, or null for an empty field. `undefined` means the text is not a date. */
export function parseRestockDate(value: string): string | null | undefined {
  const text = value.trim();
  if (!text) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return undefined;
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) return undefined;
  return text;
}

export type SetStockInput = {
  partNumber: string;
  expected: string;
  qty: string;
  restockOn: string;
  actor: string;
};

export type SetStockResult =
  | { ok: true; part_number: string; from: number; to: number }
  | { ok: false; reason: "invalid-qty" | "invalid-date" | "missing" | "stale" | "failed"; part_number: string };

/**
 * Sets a shelf count. The UPDATE only matches the count the owner saw, so an order that
 * arrived in between makes it change 0 rows instead of being overwritten.
 */
export async function setStock(db: AdminDatabase, input: SetStockInput): Promise<SetStockResult> {
  const part = input.partNumber;
  const qty = parseQty(input.qty);
  const expected = parseQty(input.expected);
  const date = parseRestockDate(input.restockOn);
  if (qty === null || expected === null) return { ok: false, reason: "invalid-qty", part_number: part };
  if (date === undefined) return { ok: false, reason: "invalid-date", part_number: part };
  try {
    const results = await db.batch([
      db.prepare("UPDATE stock SET qty = ?, restock_on = ? WHERE part_number = ? AND qty = ?").bind(qty, qty > 0 ? null : date, part, expected),
      recordAuditStatement(db, {
        actor: input.actor,
        action: "stock.set",
        target: part,
        detail: { from: expected, to: qty, ...(qty === 0 && date ? { restock_on: date } : {}) },
      }),
    ]);
    if (changesOf(results[0]) === 1) return { ok: true, part_number: part, from: expected, to: qty };
    const row = await db.prepare("SELECT qty FROM stock WHERE part_number = ?").bind(part).first<{ qty: number }>();
    return { ok: false, reason: row ? "stale" : "missing", part_number: part };
  } catch (error) {
    console.error("Stock write failed:", error instanceof Error ? error.name : "unknown");
    return { ok: false, reason: "failed", part_number: part };
  }
}
