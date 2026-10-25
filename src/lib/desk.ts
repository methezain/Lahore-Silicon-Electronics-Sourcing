/** Counter hours and the sourcing form. Dispatch and delivery live in `shipping.ts`. */

export const deskHours =
  "Monday to Saturday, 9:00 AM – 6:00 PM PKT. Sunday closed.";

/** Trading place. Not a street address. There is no shop number yet (docs/decisions.md). */
export const counterPlace = "Hall Road, Lahore";

export const inspectedBeforeDispatch =
  "Every part is physically inspected before dispatch.";

export const partsListRule = "Enter the part numbers you need.";

export function partsMessage(value: string): string | null {
  return value.trim() ? null : partsListRule;
}

/** WhatsApp body for a part that is not in the catalog. */
export function sourcingMessage(phone: string, parts: string): string {
  return `Phone: ${phone.trim()}\n\n${parts.trim()}`;
}
