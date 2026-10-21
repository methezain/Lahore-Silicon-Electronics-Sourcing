import { z } from "zod";
import {
  addressLine2Rule,
  addressMessage,
  cityMessage,
  emptyCart,
  nameMessage,
  orderNotSaved,
  paymentRefMessage,
  tooManyLines,
} from "./order";
import { isOrderKey } from "./order-key";
import { phoneMessage } from "./phone";

const MAX_LINES = 20;

const lineSchema = z.object({
  part_number: z.string().min(1),
  quantity: z.number().int().min(1),
  name: z.string().optional(),
  price: z.number().optional(),
});

/** A form field. Astro turns an empty control into null before this schema runs. */
function text(check: (value: string) => string | null) {
  return z.union([z.string(), z.null()]).transform((value, ctx) => {
    const raw = value ?? "";
    const message = check(raw);
    if (message) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return raw;
  });
}

/**
 * Checkout form. `accept: 'form'` parses this from the posted fields.
 * `items` is a JSON list because a form has no nested cart object.
 */
export const orderFormSchema = z.object({
  name: text(nameMessage),
  phone: text(phoneMessage),
  destination: text(cityMessage),
  address: text(addressMessage),
  address_line_2: z.union([z.string(), z.null()]).transform((value, ctx) => {
    const textValue = (value ?? "").trim();
    if (!textValue) return undefined;
    if (textValue.length > 120) {
      ctx.addIssue({ code: "custom", message: addressLine2Rule });
      return z.NEVER;
    }
    return textValue;
  }),
  payment_ref: text(paymentRefMessage),
  idempotency_key: z.union([z.string(), z.null()]).transform((value, ctx) => {
    const key = (value ?? "").trim();
    if (!isOrderKey(key)) {
      ctx.addIssue({ code: "custom", message: orderNotSaved });
      return z.NEVER;
    }
    return key;
  }),
  "cf-turnstile-response": z.union([z.string(), z.null()]).transform((value) => (value ?? "").trim()),
  total: z.union([z.number(), z.string(), z.null()]).transform((value, ctx) => {
    const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
    if (!Number.isInteger(parsed) || parsed < 1) {
      ctx.addIssue({ code: "custom", message: "Order total must be a positive integer number of PKR." });
      return z.NEVER;
    }
    return parsed;
  }),
  items: z.union([z.string(), z.null()]).transform((value, ctx) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(typeof value === "string" ? value : "");
    } catch {
      ctx.addIssue({ code: "custom", message: emptyCart });
      return z.NEVER;
    }
    const lines = z.array(lineSchema).min(1, emptyCart).max(MAX_LINES, tooManyLines).safeParse(parsed);
    if (!lines.success) {
      ctx.addIssue({ code: "custom", message: lines.error.issues[0]?.message ?? emptyCart });
      return z.NEVER;
    }
    return lines.data;
  }),
});

export type OrderForm = z.infer<typeof orderFormSchema>;
