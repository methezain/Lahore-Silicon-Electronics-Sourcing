import { dispatchZone } from "./clock";

/** Buyer-facing order sentences. Copy from docs/copy.md. */

export const nameRule = "Enter your name (at least 2 letters).";
export const cityRule = "Enter your city or area.";
export const addressRule = "Enter the full address, with house and street.";
export const paymentRefRule = "Paste the transaction ID from your payment (at least 5 characters).";
export const addressLine2Rule = "Address line 2 must be 120 characters or fewer.";
export const tooManyLines = "The cart has too many lines.";
export const emptyCart = "Cart cannot be empty.";
export const checkNotComplete = "Complete the check before placing the order.";
export const tooManyOrders = "Too many order attempts. Wait a minute and try again.";
export const placingOrder = "Placing order…";

export const orderNotSaved =
  "The order was not saved. Nothing was charged. Try again, or message us on WhatsApp.";

export const unknownOrder = "No order with this id";

export function placeOrderLabel(totalLabel: string): string {
  return `Place order · ${totalLabel}`;
}

export function showOrderLabel(totalLabel: string): string {
  return `Show order · ${totalLabel}`;
}

/** At least two letters. Digits and punctuation do not count. */
export function nameMessage(value: string): string | null {
  const letters = value.match(/\p{L}/gu);
  return letters && letters.length >= 2 ? null : nameRule;
}

export function cityMessage(value: string): string | null {
  return value.trim().length >= 2 ? null : cityRule;
}

/** A full address is more than a house number. Ten characters is the floor the order API accepts. */
export function addressMessage(value: string): string | null {
  return value.trim().length >= 10 ? null : addressRule;
}

export function paymentRefMessage(value: string): string | null {
  return value.trim().length >= 5 ? null : paymentRefRule;
}

export function priceChanged(totalLabel: string): string {
  return `Prices changed while you were checking out. The new total is ${totalLabel}.`;
}

export function onlyInStock(partNumber: string, stockQty: number): string {
  return `${partNumber}: only ${stockQty} in stock.`;
}

export function newOrderId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `LHR-${hex}`;
}

/** docs/copy.md. The two halves are the heading and the lede on the receipt. */
export const orderReceivedTitle = "Order received";
export const orderReceivedNext = "We'll confirm your payment and dispatch.";

export const sendReceipt = "Send payment receipt on WhatsApp";
export const continueShopping = "Continue shopping";
export const orderCancelled = "This order was cancelled.";
export const linesUnreadable = "The line list on this order could not be read.";

export const pageMissing = "No page here.";
export const serverBroke = "Something broke on our side. Your cart is saved.";
export const tryAgain = "Try again";

export function receiptWhatsAppText(id: string): string {
  return `Order ${id}. Here is my payment receipt.`;
}

export type ReceiptLine = {
  part_number: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

/** Lines stored by the order API. A bad payload is omitted, not guessed. */
export function receiptLines(json: string): ReceiptLine[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const lines: ReceiptLine[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") return null;
    const item = row as Record<string, unknown>;
    const partNumber = item.part_number;
    const name = item.name;
    const quantity = item.quantity;
    const price = item.price;
    const lineTotal = item.line_total;
    if (typeof partNumber !== "string" || partNumber.trim() === "") return null;
    if (typeof name !== "string") return null;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) return null;
    if (typeof price !== "number" || !Number.isInteger(price) || price < 0) return null;
    if (typeof lineTotal !== "number" || !Number.isInteger(lineTotal) || lineTotal < 0) return null;
    lines.push({
      part_number: partNumber,
      name,
      quantity,
      unit_price: price,
      line_total: lineTotal,
    });
  }
  return lines;
}

export type ReceiptStep = {
  label: "Received" | "Payment confirmed" | "Dispatched";
  done: boolean;
  current: boolean;
};

export type ReceiptTimeline = {
  cancelled: boolean;
  steps: ReceiptStep[];
};

const RECEIPT_LABELS = ["Received", "Payment confirmed", "Dispatched"] as const;

/**
 * Pending: saved, payment not confirmed.
 * Paid, Dispatched, and Delivered advance the same three steps.
 * Any other status, including one we do not know, stops at Received.
 */
export function receiptTimeline(status: string): ReceiptTimeline {
  if (status === "Cancelled") return { cancelled: true, steps: [] };

  const doneThrough = status === "Dispatched" || status === "Delivered" ? 3 : status === "Paid" ? 2 : 1;
  return {
    cancelled: false,
    steps: RECEIPT_LABELS.map((label, index) => ({
      label,
      done: index < doneThrough,
      current: index === doneThrough,
    })),
  };
}

export function stepStateLabel(done: boolean): "Done" | "Not yet" {
  return done ? "Done" : "Not yet";
}

/**
 * D1 stores `CURRENT_TIMESTAMP` as UTC `YYYY-MM-DD HH:MM:SS`.
 * The receipt prints that instant in Asia/Karachi, `12 Nov 2026`.
 */
export function formatOrderDate(value: unknown, timeZone = dispatchZone): string | null {
  let text: string | null = null;
  if (typeof value === "string") text = value.trim();
  else if (value instanceof Date && !Number.isNaN(value.getTime())) text = value.toISOString();
  if (!text) return null;

  const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/.exec(text);
  if (!match) return null;
  const date = new Date(`${match[1]}T${match[2]}Z`);
  if (Number.isNaN(date.getTime())) return null;

  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "numeric",
      month: "short",
      year: "numeric",
    }).formatToParts(date);
  } catch {
    return null;
  }

  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;
  if (!day || !month || !year) return null;
  return `${day} ${month} ${year}`;
}
