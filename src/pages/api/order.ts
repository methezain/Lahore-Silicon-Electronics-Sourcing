import type { APIRoute } from "astro";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { loadCatalog } from "../../lib/catalog";
import { quoteOrder } from "../../lib/money";
import { newOrderId, onlyInStock, orderNotSaved } from "../../lib/order";
import { normalizePkMobile, phoneRule } from "../../lib/phone";

export const prerender = false;

const MAX_LINES = 20;

const OrderSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(1, phoneRule),
  destination: z.string().trim().min(2, "Enter the city or area."),
  address: z.string().trim().min(10, "Please provide a complete address"),
  address_line_2: z.string().trim().max(120).optional(),
  payment_ref: z.string().min(5, "Payment Reference is too short"),
  items: z
    .array(
      z.object({
        part_number: z.string().min(1),
        name: z.string().optional(),
        price: z.number().optional(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, "Cart cannot be empty"),
  total: z.number().int().min(1),
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Error && /unique/i.test(error.message);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const result = OrderSchema.safeParse(body);

    if (!result.success) {
      return json({ error: result.error.issues[0].message }, 400);
    }

    const { name, phone, destination, address, address_line_2, payment_ref, items, total } = result.data;
    if (items.length > MAX_LINES) {
      return json({ error: "The cart has too many lines." }, 400);
    }

    const e164 = normalizePkMobile(phone);
    if (!e164) return json({ error: phoneRule }, 400);

    const storedAddress = address_line_2 ? `${address}\n${address_line_2}` : address;
    const catalog = await loadCatalog();
    const quote = quoteOrder(
      catalog,
      items.map((item) => ({ part_number: item.part_number, quantity: item.quantity })),
      total,
    );

    if (!quote.ok) return json({ error: quote.error }, 400);

    for (const line of quote.items) {
      const part = catalog.find((entry) => entry.part_number === line.part_number);
      if (!part || line.quantity > part.stock_qty) {
        return json({ error: onlyInStock(line.part_number, part?.stock_qty ?? 0) }, 400);
      }
    }

    const db = env?.DB;
    if (!db) {
      console.error("D1 binding DB is missing.");
      return json({ error: orderNotSaved }, 500);
    }

    // The inserted total is the catalog quote. The client total was only accepted because it matched.
    let orderId = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      orderId = newOrderId();
      try {
        await db
          .prepare(
            "INSERT INTO Orders (id, customer_name, phone, destination, address, items_json, total_price, payment_ref, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            orderId,
            name,
            e164,
            destination,
            storedAddress,
            JSON.stringify(quote.items),
            quote.total,
            payment_ref,
            "Pending",
          )
          .run();
        return json({ success: true, id: orderId }, 200);
      } catch (error) {
        if (attempt < 2 && isUniqueConflict(error)) continue;
        console.error("Order insert failed.");
        return json({ error: orderNotSaved }, 500);
      }
    }

    console.error("Order insert failed.");
    return json({ error: orderNotSaved }, 500);
  } catch (error) {
    console.error("Order API Error:", error instanceof Error ? error.name : "unknown");
    return json({ error: orderNotSaved }, 500);
  }
};
