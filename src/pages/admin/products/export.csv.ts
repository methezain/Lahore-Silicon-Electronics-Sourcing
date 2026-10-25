import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { recordAudit, type AuditDatabase } from "../../../lib/admin/audit";
import { adminActor } from "../../../lib/admin/constants";
import { toCsv } from "../../../lib/admin/csv";
import type { AdminDatabase } from "../../../lib/admin/db";
import { listProducts } from "../../../lib/admin/products";

export const prerender = false;

export const GET: APIRoute = async () => {
  const db = env?.DB as unknown as AdminDatabase | undefined;
  if (!db) return new Response("Products could not be read.", { status: 500 });
  try {
    const rows = await listProducts(db);
    const body = toCsv(
      ["Part number", "Name", "Category", "Price (Rs)", "On the shelf", "Shown on shop"],
      rows.map((row) => [row.part_number, row.name, row.category, row.price, row.qty ?? 0, row.published === 1 ? "yes" : "no"]),
    );
    await recordAudit(env.DB as unknown as AuditDatabase, { actor: adminActor, action: "products.export", detail: { rows: rows.length } });
    return new Response(body, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="products.csv"' },
    });
  } catch (error) {
    console.error("Products export failed:", error instanceof Error ? error.name : "unknown");
    return new Response("Products could not be read.", { status: 500 });
  }
};
