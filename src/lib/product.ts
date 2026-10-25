/**
 * Product-page facts that are not a price or a stock count.
 * Price: src/lib/money.ts. Stock words: src/lib/stock.ts.
 * The countdown is src/lib/clock.ts. Windows are src/lib/shipping.ts.
 * Key figures follow `key_specs` when the part lists them.
 * With no labels, the tiles are the first four catalog specs.
 */

import { dispatchClock } from "./clock";
import { formatPkr, lineTotal, unitPrice, type Priceable } from "./money";
import { stockLabel, stockLevel, type StockLevel } from "./stock";
import { deliveryCost, lahoreDelivery, nationwideDelivery } from "./shipping";

export type CatalogSpec = {
  label: string;
  value: string;
  unit?: string;
};

export type KeyFigure = {
  label: string;
  value: string;
  unit?: string;
};

/** Four tiles when the part does not name `key_specs`. */
export const KEY_FIGURE_COUNT = 4;

function toFigure(spec: CatalogSpec): KeyFigure {
  return {
    label: spec.label,
    value: spec.value,
    ...(spec.unit ? { unit: spec.unit } : {}),
  };
}

/**
 * Tiles for the labels in `key_specs`, in that order.
 * A missing label is skipped. With no labels, the first four specs are used.
 */
export function keyFigures(specs: readonly CatalogSpec[], labels?: readonly string[]): KeyFigure[] {
  if (!labels || labels.length === 0) return specs.slice(0, KEY_FIGURE_COUNT).map(toFigure);
  return labels.flatMap((label) => {
    const spec = specs.find((item) => item.label === label);
    return spec ? [toFigure(spec)] : [];
  });
}

/**
 * Package and board geometry. Everything else in `specs` is electrical.
 * docs/premium-roadmap.md R4. A label that is not in this set stays in Electrical.
 */
const PHYSICAL_SPEC_LABELS = new Set(["Package", "Mounting", "Pin count", "USB connector"]);

export type SpecGroup = {
  title: "Electrical" | "Physical" | "In the bag";
  rows: CatalogSpec[];
  /** Bag sentence. Not a spec row, so it has no invented label. */
  prose?: string;
};

/** Electrical, then Physical, then the bag sentence when the part has one. */
export function specGroups(specs: readonly CatalogSpec[], inTheBag?: string): SpecGroup[] {
  const physical = specs.filter((spec) => PHYSICAL_SPEC_LABELS.has(spec.label));
  const electrical = specs.filter((spec) => !PHYSICAL_SPEC_LABELS.has(spec.label));
  const groups: SpecGroup[] = [];
  if (electrical.length > 0) groups.push({ title: "Electrical", rows: electrical });
  if (physical.length > 0) groups.push({ title: "Physical", rows: physical });
  const bag = inTheBag?.trim();
  if (bag) groups.push({ title: "In the bag", rows: [], prose: bag });
  return groups;
}

/** Page description. docs/copy.md#metadata. */
export function productMetaDescription(summary: string): string {
  return `${summary} Ships from Hall Road, Lahore.`;
}

export type BreakTier = {
  quantity: string;
  unitPrice: string;
};

/** Empty unless the part has `breaks`. The base price covers quantities below the first tier. */
export function quantityBreakTable(part: Priceable): BreakTier[] {
  const breaks = part.breaks;
  if (!breaks || breaks.length === 0) return [];

  const byQty = new Map<number, number>();
  for (const row of breaks) byQty.set(row.min_qty, row.unit_price);
  const tiers = [...byQty.entries()].sort((a, b) => a[0] - b[0]);
  const rows: BreakTier[] = [];

  if (tiers[0][0] > 1) {
    rows.push({
      quantity: `1–${tiers[0][0] - 1}`,
      unitPrice: formatPkr(part.price),
    });
  }

  tiers.forEach(([min, unit], index) => {
    const next = tiers[index + 1];
    rows.push({
      quantity: next ? `${min}–${next[0] - 1}` : `${min}+`,
      unitPrice: formatPkr(unit),
    });
  });

  return rows;
}

export type PurchaseInput = {
  stockQty: number;
  restockOn?: string;
  lowStockAt?: number;
  /** Line total in integer PKR. Unused when nothing is on the shelf. */
  lineTotal: number;
  /** Set only when the shop phone is configured. */
  askHref?: string;
};

export type PurchaseModel = {
  label: string;
  disabled: boolean;
  askHref?: string;
  stock: string;
  level: StockLevel;
};

/** Out of stock disables the add control. The label says why. WhatsApp only then, and only if configured. */
export function purchaseModel(input: PurchaseInput): PurchaseModel {
  const out = !Number.isInteger(input.stockQty) || input.stockQty < 1;
  return {
    label: out ? "Out of stock" : `Add to cart · ${formatPkr(input.lineTotal)}`,
    disabled: out,
    ...(out && input.askHref ? { askHref: input.askHref } : {}),
    stock: stockLabel(input.stockQty, input.restockOn),
    level: stockLevel(input.stockQty, input.lowStockAt),
  };
}

/** Unit price and line total for the chosen quantity. Quantity 0 keeps the shelf price and does not call `unitPrice`. */
export function pricedChoice(part: Priceable, quantity: number, stockQty: number): { unit: number; total: number } {
  if (!Number.isInteger(stockQty) || stockQty < 1 || !Number.isInteger(quantity) || quantity < 1) {
    return { unit: part.price, total: part.price };
  }
  return { unit: unitPrice(part, quantity), total: lineTotal(part, quantity) };
}

/** Delivery windows plus the cost rule. These do not depend on the clock. */
export const etaDetail = `${lahoreDelivery} ${nationwideDelivery} ${deliveryCost}`;

/**
 * Bold ETA lead. Null when the clock cannot be read.
 * Call this in the browser on a prerendered product page so the countdown is not frozen at build time.
 */
export function etaLead(now?: Date): string | null {
  return dispatchClock(now).eta;
}
