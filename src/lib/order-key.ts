/** A checkout attempt. The same key retries one order; a new checkout mints a new key. */

const ORDER_KEY =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const checkoutCookie = "ls_checkout";
export const checkoutKeyStorage = "lahore_silicon_checkout_key";

/** Stable Turnstile action for the checkout surface. Siteverify must echo it. */
export const turnstileAction = "checkout";

export function isOrderKey(value: string): boolean {
  return ORDER_KEY.test(value);
}

/** Checkout action, form post and RPC. The limit is this route plus the actor. */
export const orderRoute = "POST /_actions/placeOrder";

/** Route plus the checkout session, or the connecting IP when the cookie is absent. */
export function orderLimitKey(actor: string): string {
  return `${orderRoute}:${actor}`;
}

export function orderActor(session: string | null, remoteip: string | null): string | null {
  if (session && isOrderKey(session)) return session;
  const ip = remoteip?.trim() ?? "";
  if (ip.length > 0 && ip.length <= 64 && !/[\s,]/.test(ip)) return ip;
  return null;
}

export function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const raw = part.slice(eq + 1).trim();
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}
