import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { AdminBound, AdminDatabase, AdminResult } from '../../../src/lib/admin/db';

type Params = (string | number | null)[];

/** A D1-shaped wrapper over node:sqlite so service SQL runs against a real SQLite. */
export function createDb(schema = true): { db: AdminDatabase; raw: DatabaseSync } {
  const raw = new DatabaseSync(':memory:');
  if (schema) raw.exec(readFileSync('db/schema.sql', 'utf8'));

  const bound = (sql: string, values: unknown[]): AdminBound => {
    const params = values as Params;
    return {
      async run(): Promise<AdminResult> {
        const result = raw.prepare(sql).run(...params);
        return { meta: { changes: Number(result.changes) } };
      },
      async first<T>() {
        return (raw.prepare(sql).get(...params) as T | undefined) ?? null;
      },
      async all<T>() {
        return { results: raw.prepare(sql).all(...params) as T[] };
      },
    };
  };

  const db: AdminDatabase = {
    prepare: (sql: string) => ({ bind: (...values: unknown[]) => bound(sql, values) }),
    async batch(statements) {
      raw.exec('BEGIN');
      try {
        const results: AdminResult[] = [];
        for (const statement of statements) results.push(await statement.run());
        raw.exec('COMMIT');
        return results;
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return { db, raw };
}

export type SeedOrder = {
  id: string;
  status?: string;
  created_at?: string;
  name?: string;
  phone?: string;
  total?: number;
  items?: { part_number: string; name?: string; quantity: number; price?: number }[];
  city?: string;
};

export function seedOrder(raw: DatabaseSync, order: SeedOrder): void {
  const items = order.items ?? [{ part_number: 'LM7805', quantity: 2, price: 45 }];
  const lines = items.map((item) => ({
    part_number: item.part_number,
    name: item.name ?? item.part_number,
    price: item.price ?? 45,
    quantity: item.quantity,
    line_total: (item.price ?? 45) * item.quantity,
  }));
  raw
    .prepare(
      'INSERT INTO Orders (id, customer_name, phone, destination, address, items_json, total_price, payment_ref, status, created_at, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      order.id,
      order.name ?? 'Test Buyer',
      order.phone ?? '+923001234567',
      order.city ?? 'Lahore',
      'House 1, Street 2, Town',
      JSON.stringify(lines),
      order.total ?? lines.reduce((sum, line) => sum + line.line_total, 0),
      'TXN12345',
      order.status ?? 'Pending',
      order.created_at ?? '2026-10-24 06:00:00',
      `key-${order.id}`,
    );
}

export function stockOf(raw: DatabaseSync, part: string): number {
  return (raw.prepare('SELECT qty FROM stock WHERE part_number = ?').get(part) as { qty: number }).qty;
}
