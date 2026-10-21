import { isOrderKey } from "./order-key";
import { newOrderId } from "./order";

export type BatchResult = {
  meta?: { changes?: number };
};

export interface OrderBound {
  run(): Promise<BatchResult>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}

export interface OrderDatabase {
  prepare(query: string): {
    bind(...values: unknown[]): OrderBound;
  };
  /** Atomic. A failed statement rolls back every statement in the list. */
  batch(statements: readonly OrderBound[]): Promise<readonly BatchResult[]>;
}

export type StoredOrder = {
  idempotencyKey: string;
  customerName: string;
  phone: string;
  destination: string;
  address: string;
  itemsJson: string;
  totalPrice: number;
  paymentRef: string;
};

const FIND_ORDER = "SELECT id FROM Orders WHERE idempotency_key = ?";
const READ_STOCK = "SELECT qty FROM stock WHERE part_number = ?";
const DECREMENT_STOCK = "UPDATE stock SET qty = qty - ? WHERE part_number = ?";
/** After the decrement: a missing part yields NULL and NOT NULL fails the batch. */
const ASSERT_STOCK =
  "UPDATE stock_guard SET ok = (SELECT qty >= 0 FROM stock WHERE part_number = ?) WHERE id = 1";
const INSERT_ORDER =
  "INSERT INTO Orders (id, customer_name, phone, destination, address, items_json, total_price, payment_ref, status, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

export type StockLine = {
  part_number: string;
  quantity: number;
};

export type CommitResult =
  | { ok: true; id: string; changes: number[] }
  | { ok: false; reason: "oversell" | "conflict" | "failed" };

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "";
}

/** A shelf CHECK failure, or the guard rejecting a part that is not in `stock`. */
export function isStockRejection(error: unknown): boolean {
  const message = errorText(error);
  return /CHECK constraint failed/i.test(message) || /NOT NULL constraint failed: stock_guard\.ok/i.test(message);
}

export async function readStockQty(db: OrderDatabase, partNumber: string): Promise<number | null> {
  const row = await db.prepare(READ_STOCK).bind(partNumber).first<{ qty?: unknown }>();
  return row && typeof row.qty === "number" && Number.isInteger(row.qty) ? row.qty : null;
}

function changesOf(result: BatchResult | undefined): number {
  const changes = result?.meta?.changes;
  return typeof changes === "number" ? changes : 0;
}

/** `idempotency_key`, `id`, or `unknown` when the message does not name the column. */
export function uniqueColumn(error: unknown): "idempotency_key" | "id" | "unknown" | null {
  if (!(error instanceof Error)) return null;
  const named = /UNIQUE constraint failed: (\S+)/i.exec(error.message);
  if (!named) return /unique/i.test(error.message) ? "unknown" : null;
  const target = named[1].toLowerCase();
  if (target.endsWith("idempotency_key")) return "idempotency_key";
  if (target.endsWith(".id") || target === "id") return "id";
  return "unknown";
}

export async function findOrderId(db: OrderDatabase, idempotencyKey: string): Promise<string | null> {
  const row = await db.prepare(FIND_ORDER).bind(idempotencyKey).first<{ id?: unknown }>();
  return row && typeof row.id === "string" && row.id ? row.id : null;
}

/**
 * Inserts one order. A second call with the same idempotency key returns the
 * first id and does not write another row. An order-id collision retries.
 */
export async function saveOrder(
  db: OrderDatabase,
  order: StoredOrder,
  newId: () => string = newOrderId,
): Promise<string | null> {
  if (!isOrderKey(order.idempotencyKey)) return null;

  const existing = await findOrderId(db, order.idempotencyKey);
  if (existing) return existing;

  for (let attempt = 0; attempt < 3; attempt++) {
    const id = newId();
    try {
      await db
        .prepare(INSERT_ORDER)
        .bind(
          id,
          order.customerName,
          order.phone,
          order.destination,
          order.address,
          order.itemsJson,
          order.totalPrice,
          order.paymentRef,
          "Pending",
          order.idempotencyKey,
        )
        .run();
      return id;
    } catch (error) {
      const column = uniqueColumn(error);
      if (column === "idempotency_key" || column === "unknown") {
        const again = await findOrderId(db, order.idempotencyKey);
        if (again) return again;
      }
      if ((column === "id" || column === "unknown") && attempt < 2) continue;
      console.error("Order insert failed.");
      return null;
    }
  }

  console.error("Order insert failed.");
  return null;
}

/**
 * Decrements each part, then inserts the order, in one batch.
 * An oversell or a missing part fails a constraint and rolls the batch back.
 * `changes` is one entry per decrement and one for the insert. Each must be 1.
 */
export async function commitOrder(
  db: OrderDatabase,
  order: StoredOrder,
  lines: readonly StockLine[],
  newId: () => string = newOrderId,
): Promise<CommitResult> {
  if (!isOrderKey(order.idempotencyKey) || lines.length === 0) return { ok: false, reason: "failed" };

  for (let attempt = 0; attempt < 3; attempt++) {
    const id = newId();
    const statements: OrderBound[] = [];
    for (const line of lines) {
      statements.push(db.prepare(DECREMENT_STOCK).bind(line.quantity, line.part_number));
      statements.push(db.prepare(ASSERT_STOCK).bind(line.part_number));
    }
    statements.push(
      db.prepare(INSERT_ORDER).bind(
        id,
        order.customerName,
        order.phone,
        order.destination,
        order.address,
        order.itemsJson,
        order.totalPrice,
        order.paymentRef,
        "Pending",
        order.idempotencyKey,
      ),
    );

    try {
      const results = await db.batch(statements);
      const changes: number[] = [];
      for (let index = 0; index < lines.length; index++) {
        changes.push(changesOf(results[index * 2]));
      }
      changes.push(changesOf(results[results.length - 1]));
      if (changes.some((count) => count !== 1)) {
        console.error("Stock decrement did not change one row.");
        return { ok: false, reason: "failed" };
      }
      return { ok: true, id, changes };
    } catch (error) {
      const column = uniqueColumn(error);
      if (column === "id" && attempt < 2) continue;
      if (column === "unknown") {
        const again = await findOrderId(db, order.idempotencyKey);
        if (again) return { ok: true, id: again, changes: [] };
        if (attempt < 2) continue;
      }
      if (column === "idempotency_key") return { ok: false, reason: "conflict" };
      if (isStockRejection(error)) return { ok: false, reason: "oversell" };
      console.error("Order batch failed:", error instanceof Error ? error.name : "unknown");
      return { ok: false, reason: "failed" };
    }
  }

  console.error("Order batch failed.");
  return { ok: false, reason: "failed" };
}
