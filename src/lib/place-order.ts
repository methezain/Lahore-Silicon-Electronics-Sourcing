import type { CatalogPrice } from "./money";
import { quoteOrder } from "./money";
import {
  addressLine2Rule,
  addressMessage,
  checkNotComplete,
  cityMessage,
  emptyCart,
  nameMessage,
  onlyInStock,
  orderNotSaved,
  paymentRefMessage,
  tooManyLines,
  tooManyOrders,
} from "./order";
import { cookieValue, isOrderKey, orderActor, orderLimitKey, checkoutCookie } from "./order-key";
import { commitOrder, findOrderId, readStockQty, type OrderDatabase } from "./order-store";
import { normalizePkMobile, phoneMessage } from "./phone";
import { turnstileHostnames, verifyTurnstile } from "./turnstile";

const MAX_LINES = 20;

export type OrderPart = CatalogPrice & { stock_qty?: number };

export type OrderLimiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

export type PlaceOrderInput = {
  name: string;
  phone: string;
  destination: string;
  address: string;
  address_line_2?: string;
  payment_ref: string;
  items: { part_number: string; name?: string; price?: number; quantity: number }[];
  total: number;
  idempotency_key: string;
  turnstileToken: string;
};

export type PlaceOrderCall = {
  input: PlaceOrderInput;
  remoteip: string | null;
  cookieHeader: string | null;
};

export type PlaceOrderDeps = {
  db: OrderDatabase | undefined;
  secret: string | undefined;
  hostnames: string | undefined;
  limiter: OrderLimiter | undefined;
  catalog: readonly OrderPart[];
  fetchImpl?: (url: string, init: RequestInit) => Promise<Response>;
};

export type PlaceOrderResult =
  | { ok: true; id: string }
  | { ok: false; status: number; error: string };

/**
 * Validate, verify Turnstile, rate-limit, re-price, then decrement live stock
 * and insert the order in one batch. A second submit with the same idempotency
 * key returns the first order id and does not decrement again.
 */
export async function placeOrder(call: PlaceOrderCall, deps: PlaceOrderDeps): Promise<PlaceOrderResult> {
  try {
    const { name, phone, destination, address, address_line_2, payment_ref, items, total } = call.input;
    if (items.length === 0) return { ok: false, status: 400, error: emptyCart };
    if (items.length > MAX_LINES) return { ok: false, status: 400, error: tooManyLines };

    const fieldError = nameMessage(name)
      ?? phoneMessage(phone)
      ?? cityMessage(destination)
      ?? addressMessage(address)
      ?? (address_line_2 && address_line_2.trim().length > 120 ? addressLine2Rule : null)
      ?? paymentRefMessage(payment_ref);
    if (fieldError) return { ok: false, status: 400, error: fieldError };

    const e164 = normalizePkMobile(phone);
    if (!e164) return { ok: false, status: 400, error: phoneMessage(phone) ?? orderNotSaved };

    const idempotencyKey = call.input.idempotency_key;
    if (!isOrderKey(idempotencyKey)) return { ok: false, status: 400, error: orderNotSaved };

    const remoteip = call.remoteip;
    const verdict = await verifyTurnstile({
      token: call.input.turnstileToken,
      secret: deps.secret,
      remoteip,
      hostnames: turnstileHostnames(deps.hostnames),
      fetchImpl: deps.fetchImpl,
    });
    if (verdict === "rejected") return { ok: false, status: 403, error: checkNotComplete };
    if (verdict !== "ok") return { ok: false, status: 500, error: orderNotSaved };

    const session = cookieValue(call.cookieHeader, checkoutCookie);
    const actor = orderActor(session, remoteip);
    if (!deps.limiter || !actor) {
      console.error(deps.limiter ? "Order rate limit key is missing." : "Order rate limit binding is missing.");
      return { ok: false, status: 500, error: orderNotSaved };
    }

    let allowed = false;
    try {
      const outcome = await deps.limiter.limit({ key: orderLimitKey(actor) });
      allowed = outcome.success === true;
    } catch (error) {
      console.error("Order rate limit failed:", error instanceof Error ? error.name : "unknown");
      return { ok: false, status: 500, error: orderNotSaved };
    }
    if (!allowed) {
      console.error("Order rate limit rejected.");
      return { ok: false, status: 429, error: tooManyOrders };
    }

    const storedName = name.trim();
    const storedDestination = destination.trim();
    const storedAddressBody = address.trim();
    const storedRef = payment_ref.trim();
    const line2 = address_line_2?.trim() ?? "";
    const storedAddress = line2 ? `${storedAddressBody}\n${line2}` : storedAddressBody;
    const quote = quoteOrder(
      deps.catalog,
      items.map((item) => ({ part_number: item.part_number, quantity: item.quantity })),
      total,
    );
    if (!quote.ok) return { ok: false, status: 400, error: quote.error };

    const db = deps.db;
    if (!db) {
      console.error("D1 binding DB is missing.");
      return { ok: false, status: 500, error: orderNotSaved };
    }

    const existing = await findOrderId(db, idempotencyKey);
    if (existing) return { ok: true, id: existing };

    const committed = await commitOrder(db, {
      idempotencyKey,
      customerName: storedName,
      phone: e164,
      destination: storedDestination,
      address: storedAddress,
      itemsJson: JSON.stringify(quote.items),
      totalPrice: quote.total,
      paymentRef: storedRef,
    }, quote.items.map((line) => ({ part_number: line.part_number, quantity: line.quantity })));

    if (committed.ok) return { ok: true, id: committed.id };
    if (committed.reason === "conflict") {
      const again = await findOrderId(db, idempotencyKey);
      if (again) return { ok: true, id: again };
      return { ok: false, status: 500, error: orderNotSaved };
    }
    if (committed.reason === "oversell") {
      for (const line of quote.items) {
        const qty = await readStockQty(db, line.part_number);
        if (qty === null || line.quantity > qty) {
          return { ok: false, status: 400, error: onlyInStock(line.part_number, qty ?? 0) };
        }
      }
      return { ok: false, status: 400, error: orderNotSaved };
    }
    return { ok: false, status: 500, error: orderNotSaved };
  } catch (error) {
    console.error("Order API Error:", error instanceof Error ? error.name : "unknown");
    return { ok: false, status: 500, error: orderNotSaved };
  }
}
