import type { APIRoute } from 'astro';
import { z } from 'zod';

// Note: prerender is false by default in server mode, but making it explicit ensures it's dynamic
export const prerender = false;

const OrderSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^[0-9]{11}$/, "Phone must be exactly 11 digits"),
  address: z.string().min(10, "Please provide a complete address"),
  payment_ref: z.string().min(5, "Payment Reference is too short"),
  items: z.array(z.object({
    part_number: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number().min(1)
  })).min(1, "Cart cannot be empty"),
  total: z.number().min(1),
  turnstile_token: z.string()
});

import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const result = OrderSchema.safeParse(body);
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error.issues[0].message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { name, phone, address, payment_ref, items, total, turnstile_token } = result.data;

    // --- STUB: Turnstile Validation ---
    if (turnstile_token !== 'dummy_token') {
      return new Response(JSON.stringify({ error: 'Bot verification failed' }), { status: 403 });
    }
    
    const orderId = `LHR-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // --- Database Insertion ---
    if (!env || !env.DB) {
      console.warn("D1 Database binding 'DB' not found! Are we running without Wrangler?");
    } else {
      const db = env.DB as any;
      await db.prepare(
        "INSERT INTO Orders (id, customer_name, phone, address, items_json, total_price, payment_ref, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        orderId, 
        name, 
        phone, 
        address, 
        JSON.stringify(items), 
        total, 
        payment_ref, 
        "Pending"
      ).run();
    }

    // --- STUB: Resend Email Notification ---
    // In production, we'd dispatch an email to the admin and customer here.
    console.log(`[Resend STUB] Order ${orderId} received. Dispatching email to admin.`);
    
    return new Response(JSON.stringify({ success: true, id: orderId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (err: any) {
    console.error("Order API Error:", err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
