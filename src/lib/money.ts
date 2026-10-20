/**
 * The only place a price is computed or formatted.
 * The product page, the cart, and POST /api/order all call this module.
 * Prices are integer PKR. Quantity breaks apply only when a part has them.
 */

export type PriceBreak = {
  min_qty: number;
  unit_price: number;
};

export type Priceable = {
  /** Integer PKR for quantity 1. */
  price: number;
  breaks?: readonly PriceBreak[];
};

export type CatalogPrice = Priceable & {
  part_number: string;
  name: string;
};

export type CartLine = {
  part_number: string;
  quantity: number;
};

export type PricedLine = {
  part_number: string;
  name: string;
  /** Unit price from the catalog for this quantity. */
  price: number;
  quantity: number;
  line_total: number;
};

export type PricedCart = {
  lines: PricedLine[];
  missing: string[];
  invalid: string[];
  total: number;
};

export type OrderQuote =
  | { ok: true; items: PricedLine[]; total: number }
  | { ok: false; error: string };

export function assertIntegerPkr(amount: number): number {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("Price must be an integer number of PKR.");
  }
  return amount;
}

/** The break whose min_qty is the greatest value still at or below the quantity, or `price` when none match. */
export function unitPrice(part: Priceable, quantity: number): number {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be a positive integer.");
  }

  const base = assertIntegerPkr(part.price);
  const breaks = part.breaks ?? [];
  if (breaks.length === 0) return base;

  let matchedQty = 0;
  let matched = base;
  for (const brk of breaks) {
    if (!Number.isInteger(brk.min_qty) || brk.min_qty < 1) {
      throw new Error("A quantity break must start at a positive integer.");
    }
    const unit = assertIntegerPkr(brk.unit_price);
    if (quantity >= brk.min_qty && brk.min_qty >= matchedQty) {
      matchedQty = brk.min_qty;
      matched = unit;
    }
  }
  return matched;
}

/** Unit price times quantity. Both factors are integers, so the line total is integer PKR. */
export function lineTotal(part: Priceable, quantity: number): number {
  return unitPrice(part, quantity) * quantity;
}

/** `Rs 1,250`. Grouping separator, no decimals. */
export function formatPkr(amount: number): string {
  const n = assertIntegerPkr(amount);
  const grouped = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs ${grouped}`;
}

/**
 * Prices each part from the catalog. Stored client prices are not read.
 * Lines for the same part are merged so a quantity break sees the real quantity.
 */
export function priceCart(catalog: readonly CatalogPrice[], lines: readonly CartLine[]): PricedCart {
  const quantities = new Map<string, number>();
  const order: string[] = [];
  const invalid: string[] = [];

  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      if (!invalid.includes(line.part_number)) invalid.push(line.part_number);
      continue;
    }
    if (!quantities.has(line.part_number)) order.push(line.part_number);
    quantities.set(line.part_number, (quantities.get(line.part_number) ?? 0) + line.quantity);
  }

  const priced: PricedLine[] = [];
  const missing: string[] = [];

  for (const partNumber of order) {
    if (invalid.includes(partNumber)) continue;
    const part = catalog.find((entry) => entry.part_number === partNumber);
    const quantity = quantities.get(partNumber);
    if (!part || quantity === undefined) {
      missing.push(partNumber);
      continue;
    }
    const price = unitPrice(part, quantity);
    priced.push({
      part_number: part.part_number,
      name: part.name,
      price,
      quantity,
      line_total: lineTotal(part, quantity),
    });
  }

  return {
    lines: priced,
    missing,
    invalid,
    total: priced.reduce((sum, line) => sum + line.line_total, 0),
  };
}

/**
 * Recomputes the order from the catalog.
 * A client total that differs is rejected. The caller persists `total` only when `ok`.
 */
export function quoteOrder(
  catalog: readonly CatalogPrice[],
  lines: readonly CartLine[],
  clientTotal: number,
): OrderQuote {
  if (!Number.isInteger(clientTotal) || clientTotal < 1) {
    return { ok: false, error: "Order total must be a positive integer number of PKR." };
  }

  let priced: PricedCart;
  try {
    priced = priceCart(catalog, lines);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Price must be an integer number of PKR.";
    return { ok: false, error: message };
  }

  if (priced.invalid.length > 0) {
    return { ok: false, error: "Quantity must be a positive integer." };
  }
  if (priced.missing.length > 0) {
    return { ok: false, error: `The shop does not sell ${priced.missing[0]}.` };
  }
  if (priced.lines.length === 0) {
    return { ok: false, error: "Cart cannot be empty." };
  }
  if (clientTotal !== priced.total) {
    return {
      ok: false,
      error: `Order total does not match the catalog price. The total is ${formatPkr(priced.total)}.`,
    };
  }

  return { ok: true, items: priced.lines, total: priced.total };
}
