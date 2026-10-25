/**
 * Stock status for the indicator and the meter.
 * Rules: docs/commerce.md#stock. Words: docs/copy.md.
 * `low_stock_at` defaults to 10 until a part sets the field.
 * The meter stays hidden unless the part has a real `shelf_qty`.
 */

export const DEFAULT_LOW_STOCK_AT = 10;

export const METER_SEGMENTS = 10;

export type StockLevel = "ok" | "low" | "out";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function stockLevel(stockQty: number, lowStockAt = DEFAULT_LOW_STOCK_AT): StockLevel {
  if (!Number.isInteger(stockQty) || stockQty <= 0) return "out";
  if (!Number.isInteger(lowStockAt) || lowStockAt < 0) {
    throw new Error("low_stock_at must be a non-negative integer.");
  }
  if (stockQty <= lowStockAt) return "low";
  return "ok";
}

/** `12 Nov 2026`. Undefined when the string is not an ISO date. */
export function formatRestockDate(iso: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return undefined;
  const month = MONTHS[Number(match[2]) - 1];
  const day = Number(match[3]);
  if (!month || day < 1 || day > 31) return undefined;
  return `${day} ${month} ${match[1]}`;
}

export function stockLabel(stockQty: number, restockOn?: string): string {
  if (Number.isInteger(stockQty) && stockQty > 0) return `${stockQty} in stock`;
  const date = restockOn ? formatRestockDate(restockOn) : undefined;
  return date ? `Out of stock, back around ${date}` : "Out of stock";
}

/**
 * How many of the 10 segments are on.
 * Each segment is 10% of `shelfQty`. A missing or empty shelf fills nothing.
 */
export function meterOnCount(stockQty: number, shelfQty: number): number {
  if (!Number.isInteger(shelfQty) || shelfQty < 1) return 0;
  if (!Number.isInteger(stockQty) || stockQty < 1) return 0;
  return Math.min(METER_SEGMENTS, Math.ceil((stockQty / shelfQty) * METER_SEGMENTS));
}
