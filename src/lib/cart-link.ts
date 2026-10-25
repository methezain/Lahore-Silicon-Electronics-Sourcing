/**
 * A cart link rebuilds `{ part_number, quantity }` on /quick-order.
 * Prices stay in the catalog. The WhatsApp body is only built when a number exists.
 */

export type CartLinkLine = {
  part_number: string;
  quantity: number;
};

const PART = /^[A-Za-z0-9][A-Za-z0-9.+_-]*$/;

export function encodeCartParam(items: readonly CartLinkLine[]): string {
  return items
    .filter((item) => item.quantity > 0 && Number.isInteger(item.quantity) && PART.test(item.part_number))
    .map((item) => `${item.part_number}:${item.quantity}`)
    .join(",");
}

export function parseCartParam(param: string): CartLinkLine[] {
  const lines: CartLinkLine[] = [];
  for (const chunk of param.split(",")) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const split = trimmed.lastIndexOf(":");
    if (split <= 0) continue;
    const part_number = trimmed.slice(0, split).trim();
    const quantity = Number(trimmed.slice(split + 1));
    if (!PART.test(part_number) || !Number.isInteger(quantity) || quantity < 1) continue;
    lines.push({ part_number, quantity });
  }
  return lines;
}

export function cartParamToText(param: string): string {
  return parseCartParam(param).map((item) => `${item.part_number} x${item.quantity}`).join("\n");
}

/** Absolute URL that replaces the visitor's cart with these lines. */
export function cartHref(origin: string, items: readonly CartLinkLine[]): string {
  const url = new URL("/quick-order", origin);
  const param = encodeCartParam(items);
  if (param) url.searchParams.set("cart", param);
  return url.href;
}

/** Message body. The caller adds the shop number via `whatsappHref`. */
export function cartWhatsAppText(shop: string, items: readonly CartLinkLine[]): string {
  const lines = items
    .filter((item) => item.quantity > 0)
    .map((item) => `${item.part_number} × ${item.quantity}`);
  return [`${shop} cart`, ...lines].join("\n");
}
