import { readdirSync, readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { onlyInStock } from '../../src/lib/order';
import { commitOrder, readStockQty, type OrderDatabase } from '../../src/lib/order-store';
import { placeOrder, type OrderPart } from '../../src/lib/place-order';

const catalog: OrderPart[] = [
  { part_number: 'NE555', name: 'Timer', price: 20 },
  { part_number: 'LM7805', name: '5 V regulator', price: 50 },
];

/** D1 exec treats each line as its own statement. */
function sqlLines(path: string): string {
  const stripped = readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => (line.trim().startsWith('--') ? '' : line))
    .join('\n');
  return stripped
    .split(';')
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

describe('stock seed', () => {
  it('copies each catalog count once and guards the shelf at zero', () => {
    const migration = readFileSync('db/migrations/0004_stock.sql', 'utf8');
    const schema = readFileSync('db/schema.sql', 'utf8');
    expect(migration).toContain('CHECK (qty >= 0)');
    expect(schema).toContain('CHECK (qty >= 0)');
    const files = readdirSync('src/content/components').filter((name) => name.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const part = JSON.parse(readFileSync(`src/content/components/${file}`, 'utf8')) as {
        part_number: string;
        stock_qty: number;
      };
      const row = `('${part.part_number}', ${part.stock_qty})`;
      expect(migration).toContain(row);
      expect(schema).toContain(row);
    }
  });
});

describe('local D1 stock rollback', () => {
  let db: D1Database;
  let dispose: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const proxy = await getPlatformProxy<{ DB: D1Database }>({
      configPath: 'wrangler.jsonc',
      persist: false,
      remoteBindings: false,
      envFiles: [],
    });
    db = proxy.env.DB;
    dispose = () => proxy.dispose();
    await db.exec(sqlLines('db/schema.sql'));
  }, 120_000);

  afterAll(async () => {
    await dispose?.();
  });

  async function setQty(partNumber: string, qty: number) {
    await db.prepare(
      'INSERT INTO stock (part_number, qty) VALUES (?, ?) ON CONFLICT(part_number) DO UPDATE SET qty = excluded.qty',
    ).bind(partNumber, qty).run();
  }

  async function clearOrders() {
    await db.prepare('DELETE FROM Orders').run();
  }

  function order(key: string) {
    return {
      idempotencyKey: key,
      customerName: 'Ali',
      phone: '+923001234567',
      destination: 'Lahore',
      address: 'House 12, Mall Road',
      itemsJson: '[]',
      totalPrice: 70,
      paymentRef: 'TXN12345',
    };
  }

  it('decrements inside the batch and records one change per write', async () => {
    await clearOrders();
    await setQty('LM7805', 4);
    const saved = await commitOrder(db as unknown as OrderDatabase, order(crypto.randomUUID()), [
      { part_number: 'LM7805', quantity: 1 },
    ]);
    expect(saved).toMatchObject({ ok: true, changes: [1, 1] });
    expect(await readStockQty(db as unknown as OrderDatabase, 'LM7805')).toBe(3);
    const row = await db.prepare('SELECT COUNT(*) AS n FROM Orders').first<{ n: number }>();
    expect(Number(row?.n)).toBe(1);
  }, 30_000);

  it('rolls the earlier decrement and the order back when a later line oversells', async () => {
    await clearOrders();
    await setQty('NE555', 10);
    await setQty('LM7805', 2);
    const saved = await commitOrder(db as unknown as OrderDatabase, order(crypto.randomUUID()), [
      { part_number: 'NE555', quantity: 1 },
      { part_number: 'LM7805', quantity: 5 },
    ]);
    expect(saved).toEqual({ ok: false, reason: 'oversell' });
    expect(await readStockQty(db as unknown as OrderDatabase, 'NE555')).toBe(10);
    expect(await readStockQty(db as unknown as OrderDatabase, 'LM7805')).toBe(2);
    const row = await db.prepare('SELECT COUNT(*) AS n FROM Orders').first<{ n: number }>();
    expect(Number(row?.n)).toBe(0);
  }, 30_000);

  it('does not insert an order for a part that is not on the shelf', async () => {
    await clearOrders();
    await db.prepare("DELETE FROM stock WHERE part_number = 'LM7805'").run();
    const saved = await commitOrder(db as unknown as OrderDatabase, order(crypto.randomUUID()), [
      { part_number: 'LM7805', quantity: 1 },
    ]);
    expect(saved).toEqual({ ok: false, reason: 'oversell' });
    const row = await db.prepare('SELECT COUNT(*) AS n FROM Orders').first<{ n: number }>();
    expect(Number(row?.n)).toBe(0);
    expect(await readStockQty(db as unknown as OrderDatabase, 'LM7805')).toBeNull();
  }, 30_000);

  it('placeOrder reports the live count and leaves the shelf unchanged', async () => {
    await clearOrders();
    await setQty('NE555', 10);
    await setQty('LM7805', 2);
    const result = await placeOrder({
      input: {
        name: 'Ali',
        phone: '03001234567',
        destination: 'Lahore',
        address: 'House 12, Mall Road',
        payment_ref: 'TXN12345',
        items: [
          { part_number: 'NE555', quantity: 1 },
          { part_number: 'LM7805', quantity: 5 },
        ],
        total: 270,
        idempotency_key: crypto.randomUUID(),
        turnstileToken: 'token',
      },
      remoteip: '203.0.113.8',
      cookieHeader: 'ls_checkout=11111111-1111-4111-8111-111111111111',
    }, {
      db: db as unknown as OrderDatabase,
      secret: 'secret',
      hostnames: 'example.com',
      limiter: { async limit() { return { success: true }; } },
      catalog,
      fetchImpl: async () => new Response(JSON.stringify({
        success: true,
        action: 'checkout',
        hostname: 'example.com',
      })),
    });
    expect(result).toEqual({ ok: false, status: 400, error: onlyInStock('LM7805', 2) });
    expect(await readStockQty(db as unknown as OrderDatabase, 'NE555')).toBe(10);
    expect(await readStockQty(db as unknown as OrderDatabase, 'LM7805')).toBe(2);
  }, 30_000);
});
