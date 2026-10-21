import { ActionError, defineAction } from "astro:actions";
import { env } from "cloudflare:workers";
import { loadCatalog } from "../lib/catalog";
import { orderNotSaved } from "../lib/order";
import { orderFormSchema } from "../lib/order-form";
import { placeOrder } from "../lib/place-order";
import type { OrderDatabase } from "../lib/order-store";

/**
 * Guest checkout. `accept: 'form'` so the page can post without the island.
 * Origin checks stay on (`security.checkOrigin`, the Astro default).
 */
export const server = {
  placeOrder: defineAction({
    accept: "form",
    input: orderFormSchema,
    handler: async (input, context) => {
      try {
        const catalog = await loadCatalog();
        const result = await placeOrder({
          input: {
            name: input.name,
            phone: input.phone,
            destination: input.destination,
            address: input.address,
            address_line_2: input.address_line_2,
            payment_ref: input.payment_ref,
            items: input.items,
            total: input.total,
            idempotency_key: input.idempotency_key,
            turnstileToken: input["cf-turnstile-response"],
          },
          remoteip: context.request.headers.get("cf-connecting-ip"),
          cookieHeader: context.request.headers.get("cookie"),
        }, {
          db: env?.DB as OrderDatabase | undefined,
          secret: env?.TURNSTILE_SECRET,
          hostnames: env?.TURNSTILE_HOSTNAMES,
          limiter: env?.ORDER_LIMIT,
          catalog,
        });
        if (!result.ok) {
          throw new ActionError({
            code: ActionError.statusToCode(result.status),
            message: result.error,
          });
        }
        return { id: result.id };
      } catch (error) {
        if (error instanceof ActionError) throw error;
        console.error("Order action failed:", error instanceof Error ? error.name : "unknown");
        throw new ActionError({ code: "INTERNAL_SERVER_ERROR", message: orderNotSaved });
      }
    },
  }),
};
