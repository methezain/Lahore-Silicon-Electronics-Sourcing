import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { recordAudit, type AuditDatabase } from "../../../lib/admin/audit";
import { adminActor } from "../../../lib/admin/constants";
import { toCsv } from "../../../lib/admin/csv";
import type { AdminDatabase } from "../../../lib/admin/db";
import { exportOrders, parseOrdersQuery } from "../../../lib/admin/orders";
import { statusLabel } from "../../../lib/admin/order-status";
import { formatFull } from "../../../lib/admin/time";
import { receiptLines } from "../../../lib/order";

export const prerender = false;

const HEADER = ["Order", "Placed (Asia/Karachi)", "Status", "Buyer", "Phone", "City", "Address", "Parts", "Total (Rs)", "Payment reference", "Note"];

export const GET: APIRoute = async ({ url }) => {
  const db = env?.DB as unknown as AdminDatabase | undefined;
  if (!db) return new Response("Orders could not be read.", { status: 500 });
  const query = { ...parseOrdersQuery(url.searchParams), page: 1 };
  try {
    const rows = await exportOrders(db, query);
    const body = toCsv(
      HEADER,
      rows.map((row) => {
        const lines = receiptLines(row.items_json);
        return [
          row.id,
          formatFull(row.created_at),
          statusLabel(row.status),
          row.customer_name,
          row.phone,
          row.destination,
          row.address.replace(/\s*\n\s*/g, ", "),
          lines ? lines.map((line) => `${line.quantity} x ${line.part_number}`).join("; ") : "",
          row.total_price,
          row.payment_ref,
          row.admin_note,
        ];
      }),
    );
    await recordAudit(env.DB as unknown as AuditDatabase, { actor: adminActor, action: "orders.export", detail: { rows: rows.length } });
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="orders.csv"',
      },
    });
  } catch (error) {
    console.error("Orders export failed:", error instanceof Error ? error.name : "unknown");
    return new Response("Orders could not be read.", { status: 500 });
  }
};
