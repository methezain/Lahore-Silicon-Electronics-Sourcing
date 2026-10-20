/** Buyer-facing order sentences, and an id that will not collide in a four-digit range. */

export const orderNotSaved =
  "The order was not saved. Nothing was charged. Try again, or message the shop";

export const unknownOrder = "No order with this id";

export function newOrderId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `LHR-${hex}`;
}

export function onlyInStock(partNumber: string, stockQty: number): string {
  return `${partNumber}: Only ${stockQty} in stock`;
}
