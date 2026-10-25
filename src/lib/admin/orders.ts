import { CATALOG_PAGE_SIZE, clampPage, pageCount } from "../catalog-query";
import { normalizePkMobile } from "../phone";
import { recordAuditStatement } from "./audit";
import { changesOf, likePattern, type AdminDatabase } from "./db";
import { canMove, isOrderStatus, type OrderStatus } from "./order-status";

export const ORDERS_PAGE_SIZE = CATALOG_PAGE_SIZE;
export const EXPORT_LIMIT = 5000;
export const NOTE_MAX = 500;
const QUERY_MAX = 80;

export type OrdersQuery = {
  status: OrderStatus | null;
  q: string;
  page: number;
};

export type OrderListRow = {
  id: string;
  customer_name: string;
  destination: string | null;
  total_price: number;
  status: string;
  created_at: string | null;
  lines: number;
};

export type OrderRow = {
  id: string;
  customer_name: string;
  phone: string;
  destination: string | null;
  address: string;
  items_json: string;
  total_price: number;
  payment_ref: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  admin_note: string | null;
};

export type OrderEvent = {
  at: string;
  from_status: string;
  to_status: string;
  restocked: number;
};

export type StatusCounts = Record<"all" | OrderStatus, number>;

export function parseOrdersQuery(params: URLSearchParams): OrdersQuery {
  const status = params.get("status");
  const page = Number.parseInt(params.get("page") ?? "", 10);
  return {
    status: isOrderStatus(status) ? status : null,
    q: (params.get("q") ?? "").trim().slice(0, QUERY_MAX),
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

export function ordersParams(query: OrdersQuery, extra: Record<string, string> = {}): URLSearchParams {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (query.page > 1) params.set("page", String(query.page));
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  return params;
}

export function ordersHref(query: OrdersQuery, extra: Record<string, string> = {}): string {
  const search = ordersParams(query, extra).toString();
  return search ? `/admin/orders?${search}` : "/admin/orders";
}

function filterSql(query: OrdersQuery): { where: string; values: unknown[] } {
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (query.status) {
    clauses.push("status = ?");
    values.push(query.status);
  }
  const q = query.q.trim();
  if (q) {
    const pattern = likePattern(q);
    const phone = normalizePkMobile(q);
    const digits = q.replace(/\D/g, "").replace(/^0+/, "");
    const parts = ["id LIKE ? ESCAPE '\\'", "customer_name LIKE ? ESCAPE '\\'"];
    values.push(pattern, pattern);
    if (phone) {
      parts.push("phone = ?");
      values.push(phone);
    }
    if (digits.length >= 3) {
      parts.push("phone LIKE ? ESCAPE '\\'");
      values.push(likePattern(digits));
    }
    clauses.push(`(${parts.join(" OR ")})`);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", values };
}

const LIST_COLUMNS =
  "id, customer_name, destination, total_price, status, created_at, CASE WHEN json_valid(items_json) THEN json_array_length(items_json) ELSE 0 END AS lines";

export async function listOrders(
  db: AdminDatabase,
  query: OrdersQuery,
): Promise<{ rows: OrderListRow[]; total: number; page: number; pages: number }> {
  const { where, values } = filterSql(query);
  const counted = await db.prepare(`SELECT COUNT(*) AS n FROM Orders ${where}`).bind(...values).first<{ n: number }>();
  const total = counted?.n ?? 0;
  const page = clampPage(query.page, total);
  const rows = await db
    .prepare(`SELECT ${LIST_COLUMNS} FROM Orders ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
    .bind(...values, ORDERS_PAGE_SIZE, (page - 1) * ORDERS_PAGE_SIZE)
    .all<OrderListRow>();
  return { rows: rows.results, total, page, pages: pageCount(total) };
}

export async function exportOrders(db: AdminDatabase, query: OrdersQuery): Promise<OrderRow[]> {
  const { where, values } = filterSql(query);
  const rows = await db
    .prepare(`SELECT * FROM Orders ${where} ORDER BY created_at DESC, id DESC LIMIT ?`)
    .bind(...values, EXPORT_LIMIT)
    .all<OrderRow>();
  return rows.results;
}

export async function statusCounts(db: AdminDatabase): Promise<StatusCounts> {
  const rows = await db.prepare("SELECT status, COUNT(*) AS n FROM Orders GROUP BY status").bind().all<{ status: string; n: number }>();
  const counts: StatusCounts = { all: 0, Pending: 0, Paid: 0, Dispatched: 0, Delivered: 0, Cancelled: 0 };
  for (const row of rows.results) {
    counts.all += row.n;
    if (isOrderStatus(row.status)) counts[row.status] = row.n;
  }
  return counts;
}

export async function getOrder(db: AdminDatabase, id: string): Promise<{ order: OrderRow; events: OrderEvent[] } | null> {
  if (!id || id.length > 64) return null;
  const order = await db.prepare("SELECT * FROM Orders WHERE id = ?").bind(id).first<OrderRow>();
  if (!order) return null;
  const events = await db
    .prepare("SELECT at, from_status, to_status, restocked FROM order_events WHERE order_id = ? ORDER BY id")
    .bind(id)
    .all<OrderEvent>();
  return { order, events: events.results };
}

export type ChangeInput = {
  id: string;
  expected: string;
  to: string;
  restock: boolean;
  actor: string;
  now?: Date;
};

export type ChangeResult =
  | { ok: true; from: OrderStatus; to: OrderStatus; restocked: boolean }
  | { ok: false; reason: "missing" | "stale" | "invalid" | "failed" };

const UPDATE_STATUS = "UPDATE Orders SET status = ?, updated_at = ? WHERE id = ? AND status = ?";
const INSERT_EVENT =
  "INSERT INTO order_events (order_id, from_status, to_status, restocked, actor) SELECT ?, ?, ?, ?, ? WHERE changes() = 1";
const RESTOCK =
  "UPDATE stock SET qty = qty + COALESCE((SELECT SUM(json_extract(j.value, '$.quantity')) FROM Orders o, json_each(o.items_json) j WHERE o.id = ? AND json_extract(j.value, '$.part_number') = stock.part_number), 0) WHERE changes() = 1 AND part_number IN (SELECT json_extract(j.value, '$.part_number') FROM Orders o, json_each(o.items_json) j WHERE o.id = ?)";

/**
 * Moves an order one step. The UPDATE only matches the status the owner saw, so a
 * second click or a second device changes 0 rows. The audit row, the event row and
 * the restock each run only while `changes()` still reports that one update.
 */
export async function changeStatus(db: AdminDatabase, input: ChangeInput): Promise<ChangeResult> {
  if (!isOrderStatus(input.to) || !isOrderStatus(input.expected)) return { ok: false, reason: "invalid" };
  try {
    const current = await db.prepare("SELECT status FROM Orders WHERE id = ?").bind(input.id).first<{ status: string }>();
    if (!current) return { ok: false, reason: "missing" };
    if (current.status !== input.expected) return { ok: false, reason: "stale" };
    if (!canMove(input.expected, input.to)) return { ok: false, reason: "invalid" };

    const restock = input.restock && input.to === "Cancelled";
    const stamp = (input.now ?? new Date()).toISOString();
    const statements = [
      db.prepare(UPDATE_STATUS).bind(input.to, stamp, input.id, input.expected),
      recordAuditStatement(db, {
        actor: input.actor,
        action: "order.status",
        target: input.id,
        detail: { from: input.expected, to: input.to, restocked: restock },
      }),
      db.prepare(INSERT_EVENT).bind(input.id, input.expected, input.to, restock ? 1 : 0, input.actor),
    ];
    if (restock) statements.push(db.prepare(RESTOCK).bind(input.id, input.id));

    const results = await db.batch(statements);
    if (changesOf(results[0]) !== 1) return { ok: false, reason: "stale" };
    return { ok: true, from: input.expected, to: input.to, restocked: restock };
  } catch (error) {
    console.error("Order status change failed:", error instanceof Error ? error.name : "unknown");
    return { ok: false, reason: "failed" };
  }
}

export type NoteResult = { ok: true } | { ok: false; reason: "missing" | "too-long" | "failed" };

export async function saveNote(db: AdminDatabase, input: { id: string; note: string; actor: string }): Promise<NoteResult> {
  const note = input.note.trim();
  if (note.length > NOTE_MAX) return { ok: false, reason: "too-long" };
  try {
    const results = await db.batch([
      db.prepare("UPDATE Orders SET admin_note = ? WHERE id = ?").bind(note || null, input.id),
      recordAuditStatement(db, { actor: input.actor, action: "order.note", target: input.id, detail: { length: note.length } }),
    ]);
    return changesOf(results[0]) === 1 ? { ok: true } : { ok: false, reason: "missing" };
  } catch (error) {
    console.error("Order note failed:", error instanceof Error ? error.name : "unknown");
    return { ok: false, reason: "failed" };
  }
}
