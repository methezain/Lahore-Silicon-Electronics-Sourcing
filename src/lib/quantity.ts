export type QtyRule = {
  min_qty: number;
  qty_multiple: number;
  stock_qty: number;
};

/** Correct a typed quantity and name the rule that changed it. */
export function correctQuantity(raw: number, rule: QtyRule): { quantity: number; message?: string } {
  const min = rule.min_qty;
  const step = Math.max(1, rule.qty_multiple);
  const stock = rule.stock_qty;

  if (stock < 1) return { quantity: 0, message: `Only ${stock} in stock` };
  if (!Number.isInteger(raw) || raw < 1) {
    return { quantity: Math.min(min, stock), message: "Quantity must be a positive integer." };
  }

  let quantity = raw;
  let message: string | undefined;
  if (quantity < min) {
    quantity = min;
    message = `Minimum quantity is ${min}.`;
  }
  if (quantity > stock) {
    quantity = stock;
    message = `Only ${stock} in stock`;
  }
  if (quantity % step !== 0) {
    const floored = Math.floor(quantity / step) * step;
    quantity = Math.min(stock, Math.max(min, floored));
    if (quantity > stock || quantity % step !== 0) quantity = Math.floor(stock / step) * step;
    message = `Quantity must be a multiple of ${step}.`;
  }
  return { quantity: Math.max(0, quantity), message };
}

/** Buy-panel shortcuts. A preset the shelf cannot sell is left out. docs/commerce.md#stock. */
export const QUANTITY_PRESETS = [1, 5, 10, 25] as const;

export function quantityPresets(rule: QtyRule): number[] {
  if (rule.stock_qty < 1) return [];
  const presets: number[] = [];
  for (const preset of QUANTITY_PRESETS) {
    if (preset > rule.stock_qty) continue;
    const corrected = correctQuantity(preset, rule);
    if (corrected.message || corrected.quantity !== preset) continue;
    presets.push(preset);
  }
  return presets;
}
