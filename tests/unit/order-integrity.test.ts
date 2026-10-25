import { readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { describe, expect, it, vi } from 'vitest';
import { checkoutCookie, orderLimitKey } from '../../src/lib/order-key';
import { commitOrder, saveOrder, uniqueColumn, type OrderBound, type OrderDatabase } from '../../src/lib/order-store';
import { placeOrder, type OrderPart, type PlaceOrderCall, type PlaceOrderDeps, type PlaceOrderResult } from '../../src/lib/place-order';
import { checkNotComplete, onlyInStock, orderNotSaved, tooManyOrders } from '../../src/lib/order';

const catalog: OrderPart[] = [
  { part_number: 'LM7805', name: '5 V regulator', price: 50, stock_qty: 4 },
];

const session = '11111111-1111-4111-8111-111111111111';

function memoryDb(sql: string): DatabaseSync {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(sql);
  return sqlite;
}

function sqlValues(values: unknown[]): SQLInputValue[] {
  return values.map((value) => {
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint' || value instanceof Uint8Array) {
      return value;
    }
    throw new Error('Unexpected SQL value.');
  });
}

const batchQueues = new WeakMap<DatabaseSync, Promise<void>>();

function ordersDb(sqlite: DatabaseSync): OrderDatabase {
  if (!batchQueues.has(sqlite)) batchQueues.set(sqlite, Promise.resolve());
  return {
    prepare(query: string) {
      return {
        bind(...values: unknown[]): OrderBound {
          const bound = sqlValues(values);
          const statement = sqlite.prepare(query);
          return {
            async run() {
              const info = statement.run(...bound);
              return { meta: { changes: Number(info.changes) } };
            },
            async first<T>() {
              const row = statement.get(...bound) as T | undefined;
              return row ?? null;
            },
          };
        },
      };
    },
    batch(statements) {
      const previous = batchQueues.get(sqlite) ?? Promise.resolve();
      const job = previous.then(async () => {
        sqlite.exec('BEGIN IMMEDIATE');
        try {
          const results = [];
          for (const statement of statements) results.push(await statement.run());
          sqlite.exec('COMMIT');
          return results;
        } catch (error) {
          try {
            sqlite.exec('ROLLBACK');
          } catch {
            // The failed statement already closed the transaction.
          }
          throw error;
        }
      });
      batchQueues.set(sqlite, job.then(() => undefined, () => undefined));
      return job;
    },
  };
}

function schemaDb(): DatabaseSync {
  const sqlite = memoryDb(readFileSync('db/schema.sql', 'utf8'));
  sqlite.prepare("UPDATE stock SET qty = 4 WHERE part_number = 'LM7805'").run();
  return sqlite;
}

function stockQty(sqlite: DatabaseSync, partNumber = 'LM7805'): number {
  const row = sqlite.prepare('SELECT qty FROM stock WHERE part_number = ?').get(partNumber) as { qty: number };
  return row.qty;
}

function countOrders(sqlite: DatabaseSync): number {
  const row = sqlite.prepare('SELECT COUNT(*) AS n FROM Orders').get() as { n: number };
  return row.n;
}

function orderBody(key: string, token: string, quantity = 1) {
  return {
    name: 'Ali',
    phone: '03001234567',
    destination: 'Lahore',
    address: 'House 12, Mall Road',
    payment_ref: 'TXN12345',
    items: [{ part_number: 'LM7805', quantity }],
    total: 50 * quantity,
    idempotency_key: key,
    'cf-turnstile-response': token,
  };
}

function callOf(
  body: ReturnType<typeof orderBody>,
  options: { cookie?: string | null; remoteip?: string | null } = {},
): PlaceOrderCall {
  const cookie = options.cookie === undefined ? session : options.cookie;
  const remoteip = options.remoteip === undefined ? '203.0.113.8' : options.remoteip;
  return {
    input: {
      name: body.name,
      phone: body.phone,
      destination: body.destination,
      address: body.address,
      payment_ref: body.payment_ref,
      items: body.items,
      total: body.total,
      idempotency_key: body.idempotency_key,
      turnstileToken: body['cf-turnstile-response'],
    },
    remoteip,
    cookieHeader: cookie ? `${checkoutCookie}=${cookie}` : null,
  };
}

function orderId(result: PlaceOrderResult): string {
  if (!result.ok) throw new Error(result.error);
  return result.id;
}

function deps(sqlite: DatabaseSync, extra: Partial<PlaceOrderDeps> = {}): PlaceOrderDeps {
  return {
    db: ordersDb(sqlite),
    secret: 'secret',
    hostnames: 'example.com',
    limiter: { async limit() { return { success: true }; } },
    catalog,
    fetchImpl: async () => new Response(JSON.stringify({
      success: true,
      action: 'checkout',
      hostname: 'example.com',
    })),
    ...extra,
  };
}

describe('double submit', () => {
  it('returns the first order id and does not insert again', async () => {
    const sqlite = schemaDb();
    const key = crypto.randomUUID();
    const first = await placeOrder(callOf(orderBody(key, 'token-1')), deps(sqlite));
    const second = await placeOrder(callOf(orderBody(key, 'token-2', 2)), deps(sqlite));
    const saved = orderId(first);
    const retried = orderId(second);

    expect(retried).toBe(saved);
    expect(saved).toMatch(/^LHR-[0-9a-f]{16}$/);
    expect(countOrders(sqlite)).toBe(1);
    expect(stockQty(sqlite)).toBe(3);
    const row = sqlite.prepare('SELECT items_json, phone FROM Orders').get() as { items_json: string; phone: string };
    expect(JSON.parse(row.items_json)[0].quantity).toBe(1);
    expect(row.phone).toBe('+923001234567');
  });

  it('keeps one row when two submits run together', async () => {
    const sqlite = schemaDb();
    const key = crypto.randomUUID();
    const [first, second] = await Promise.all([
      placeOrder(callOf(orderBody(key, 'token-a')), deps(sqlite)),
      placeOrder(callOf(orderBody(key, 'token-b')), deps(sqlite)),
    ]);
    expect(orderId(second)).toBe(orderId(first));
    expect(countOrders(sqlite)).toBe(1);
    expect(stockQty(sqlite)).toBe(3);
  });

  it('returns the saved order after the part is out of stock', async () => {
    const sqlite = schemaDb();
    const key = crypto.randomUUID();
    const first = await placeOrder(callOf(orderBody(key, 'token-1')), deps(sqlite));
    const soldOut: OrderPart[] = [{ ...catalog[0], stock_qty: 0 }];
    const second = await placeOrder(callOf(orderBody(key, 'token-2')), deps(sqlite, { catalog: soldOut }));
    expect(orderId(second)).toBe(orderId(first));
    expect(countOrders(sqlite)).toBe(1);
    expect(stockQty(sqlite)).toBe(3);
  });

  it('stores a second order when the key is new', async () => {
    const sqlite = schemaDb();
    const first = await placeOrder(callOf(orderBody(crypto.randomUUID(), 'token-1')), deps(sqlite));
    const second = await placeOrder(callOf(orderBody(crypto.randomUUID(), 'token-2')), deps(sqlite));
    expect(orderId(first)).not.toBe(orderId(second));
    expect(countOrders(sqlite)).toBe(2);
    expect(stockQty(sqlite)).toBe(2);
  });
});

describe('order guards', () => {
  it('rate-limits before insert and keys the binding by route and session', async () => {
    const sqlite = schemaDb();
    const keys: string[] = [];
    const response = await placeOrder(callOf(orderBody(crypto.randomUUID(), 'token')), deps(sqlite, {
      limiter: {
        async limit({ key }) {
          keys.push(key);
          return { success: false };
        },
      },
    }));
    expect(response).toEqual({ ok: false, status: 429, error: tooManyOrders });
    expect(keys).toEqual([orderLimitKey(session)]);
    expect(countOrders(sqlite)).toBe(0);
    expect(stockQty(sqlite)).toBe(4);
  });

  it('uses the connecting IP when the checkout cookie is absent', async () => {
    const sqlite = schemaDb();
    const keys: string[] = [];
    const response = await placeOrder(callOf(orderBody(crypto.randomUUID(), 'token'), { cookie: null }), deps(sqlite, {
      limiter: {
        async limit({ key }) {
          keys.push(key);
          return { success: true };
        },
      },
    }));
    expect(response.ok).toBe(true);
    expect(keys).toEqual([orderLimitKey('203.0.113.8')]);
  });

  it('does not insert or rate-limit when Turnstile rejects the token', async () => {
    const sqlite = schemaDb();
    const limit = vi.fn(async () => ({ success: true }));
    const response = await placeOrder(callOf(orderBody(crypto.randomUUID(), 'token')), deps(sqlite, {
      limiter: { limit },
      fetchImpl: async () => new Response(JSON.stringify({ success: false })),
    }));
    expect(response).toEqual({ ok: false, status: 403, error: checkNotComplete });
    expect(limit).not.toHaveBeenCalled();
    expect(countOrders(sqlite)).toBe(0);
  });

  it('refuses the order when the secret is missing and does not call siteverify', async () => {
    const sqlite = schemaDb();
    const fetchImpl = vi.fn();
    const response = await placeOrder(callOf(orderBody(crypto.randomUUID(), 'token')), deps(sqlite, {
      secret: undefined,
      fetchImpl,
    }));
    expect(response).toEqual({ ok: false, status: 500, error: orderNotSaved });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(countOrders(sqlite)).toBe(0);
  });
});

describe('stock batch', () => {
  it('rolls back the order and the earlier line when a later line oversells', async () => {
    const sqlite = schemaDb();
    sqlite.prepare("UPDATE stock SET qty = 10 WHERE part_number = 'NE555'").run();
    sqlite.prepare("UPDATE stock SET qty = 2 WHERE part_number = 'LM7805'").run();
    const two: OrderPart[] = [
      { part_number: 'NE555', name: 'Timer', price: 20 },
      { part_number: 'LM7805', name: '5 V regulator', price: 50 },
    ];
    const body = orderBody(crypto.randomUUID(), 'token');
    body.items = [
      { part_number: 'NE555', quantity: 1 },
      { part_number: 'LM7805', quantity: 5 },
    ];
    body.total = 20 + 250;
    const response = await placeOrder(callOf(body), deps(sqlite, { catalog: two }));
    expect(response).toEqual({ ok: false, status: 400, error: onlyInStock('LM7805', 2) });
    expect(countOrders(sqlite)).toBe(0);
    expect(stockQty(sqlite, 'NE555')).toBe(10);
    expect(stockQty(sqlite, 'LM7805')).toBe(2);
  });

  it('rejects a part that has no stock row and does not insert the order', async () => {
    const sqlite = schemaDb();
    sqlite.prepare("DELETE FROM stock WHERE part_number = 'LM7805'").run();
    const response = await placeOrder(callOf(orderBody(crypto.randomUUID(), 'token')), deps(sqlite));
    expect(response).toEqual({ ok: false, status: 400, error: onlyInStock('LM7805', 0) });
    expect(countOrders(sqlite)).toBe(0);
  });

  it('retries an order id collision without decrementing twice', async () => {
    const sqlite = schemaDb();
    const taken = 'LHR-aaaaaaaaaaaaaaaa';
    const fresh = 'LHR-bbbbbbbbbbbbbbbb';
    sqlite.prepare(
      'INSERT INTO Orders (id, customer_name, phone, address, items_json, total_price, status, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(taken, 'Ali', '+923001234567', 'House 12, Mall Road', '[]', 50, 'Pending', crypto.randomUUID());
    const ids = [taken, fresh];
    let n = 0;
    const saved = await commitOrder(ordersDb(sqlite), {
      idempotencyKey: crypto.randomUUID(),
      customerName: 'Sara',
      phone: '+923001234567',
      destination: 'Lahore',
      address: 'House 12, Mall Road',
      itemsJson: '[]',
      totalPrice: 50,
      paymentRef: 'TXN12345',
    }, [{ part_number: 'LM7805', quantity: 1 }], () => ids[n++] ?? fresh);
    expect(saved).toMatchObject({ ok: true, id: fresh, changes: [1, 1] });
    expect(stockQty(sqlite)).toBe(3);
    expect(countOrders(sqlite)).toBe(2);
  });
});

describe('idempotency migration', () => {
  const legacy = `
    CREATE TABLE Orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      destination TEXT,
      address TEXT NOT NULL,
      items_json TEXT NOT NULL,
      total_price INTEGER NOT NULL,
      payment_ref TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  it('adds the unique key without dropping rows', async () => {
    const sqlite = memoryDb(legacy);
    sqlite.prepare(
      "INSERT INTO Orders (id, customer_name, phone, address, items_json, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run('LHR-aaaaaaaaaaaaaaaa', 'Ali', '+923001234567', 'House 12, Mall Road', '[]', 50, 'Pending');
    sqlite.exec(readFileSync('db/migrations/0003_idempotency.sql', 'utf8'));

    const key = crypto.randomUUID();
    const db = ordersDb(sqlite);
    const row = {
      idempotencyKey: key,
      customerName: 'Ali',
      phone: '+923001234567',
      destination: 'Lahore',
      address: 'House 12, Mall Road',
      itemsJson: '[]',
      totalPrice: 50,
      paymentRef: 'TXN12345',
    };
    const first = await saveOrder(db, row);
    const second = await saveOrder(db, row);
    expect(second).toBe(first);
    expect(countOrders(sqlite)).toBe(2);
    expect(() => sqlite.prepare(
      'INSERT INTO Orders (id, customer_name, phone, address, items_json, total_price, status, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('LHR-bbbbbbbbbbbbbbbb', 'Ali', '+923001234567', 'House 12, Mall Road', '[]', 50, 'Pending', key)).toThrow(/idempotency_key/);
  });

  it('retries when the order id collides and names the unique column', async () => {
    const sqlite = schemaDb();
    const taken = 'LHR-aaaaaaaaaaaaaaaa';
    const fresh = 'LHR-bbbbbbbbbbbbbbbb';
    sqlite.prepare(
      'INSERT INTO Orders (id, customer_name, phone, address, items_json, total_price, status, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(taken, 'Ali', '+923001234567', 'House 12, Mall Road', '[]', 50, 'Pending', crypto.randomUUID());
    const ids = [taken, fresh];
    let n = 0;
    const saved = await saveOrder(ordersDb(sqlite), {
      idempotencyKey: crypto.randomUUID(),
      customerName: 'Sara',
      phone: '+923001234567',
      destination: 'Lahore',
      address: 'House 12, Mall Road',
      itemsJson: '[]',
      totalPrice: 50,
      paymentRef: 'TXN12345',
    }, () => ids[n++] ?? fresh);
    expect(saved).toBe(fresh);
    expect(countOrders(sqlite)).toBe(2);
    expect(uniqueColumn(new Error('UNIQUE constraint failed: Orders.idempotency_key'))).toBe('idempotency_key');
    expect(uniqueColumn(new Error('UNIQUE constraint failed: Orders.id'))).toBe('id');
    expect(uniqueColumn(new Error('nope'))).toBeNull();
  });
});
