import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromBuildRecord, mapRow, type ProductRow } from '../../src/lib/catalog-map';
import { mediaSource, mediaUrl, parseMediaRef } from '../../src/lib/media';
import { storedProductSchema } from '../../src/lib/admin/product-schema';
import { setStock, parseQty, parseRestockDate, stockEntries } from '../../src/lib/admin/stock';
import { createDb, stockOf } from './helpers/sqlite-d1';

const asset = (path: string) => ({ src: `/_astro/${path}`, width: 800, height: 800, format: 'webp' as const });

function seeded() {
  execFileSync(process.execPath, ['scripts/seed-products.mjs'], { stdio: 'ignore' });
  const made = createDb();
  made.raw.exec(readFileSync('db/seed-products.sql', 'utf8'));
  return made;
}

describe('seed products', () => {
  it('writes one row per JSON record, and every row validates with the shared schema', () => {
    const { raw } = seeded();
    const files = readdirSync('src/content/components').filter((name) => name.endsWith('.json'));
    const rows = raw.prepare('SELECT * FROM products ORDER BY sort_order').all() as unknown as (ProductRow & { category: string; price: number })[];
    expect(rows).toHaveLength(files.length);
    for (const row of rows) {
      const parsed = storedProductSchema.safeParse(JSON.parse(row.data));
      expect(parsed.success, row.part_number).toBe(true);
      expect(row.category).toBe(JSON.parse(row.data).category);
      expect(row.price).toBe(JSON.parse(row.data).price);
    }
  });

  it('is idempotent and never overwrites an edited row', () => {
    const { raw } = seeded();
    raw.prepare("UPDATE products SET price = 99 WHERE part_number = 'LM7805'").run();
    raw.prepare("UPDATE stock SET qty = 3 WHERE part_number = 'LM7805'").run();
    raw.exec(readFileSync('db/seed-products.sql', 'utf8'));
    expect(raw.prepare("SELECT price FROM products WHERE part_number = 'LM7805'").get()).toEqual({ price: 99 });
    expect(stockOf(raw, 'LM7805')).toBe(3);
    expect(raw.prepare('SELECT COUNT(*) AS n FROM products').get()).toEqual({ n: 10 });
  });

  it('gives every seeded product a stock row, so it can be bought', () => {
    const { raw } = seeded();
    const missing = raw.prepare('SELECT p.part_number FROM products p LEFT JOIN stock s ON s.part_number = p.part_number WHERE s.part_number IS NULL').all();
    expect(missing).toEqual([]);
  });

  it('turns every row into a product with its photo resolved', () => {
    const { raw } = seeded();
    const rows = raw
      .prepare('SELECT p.part_number, p.published, p.sort_order, p.data, s.qty, s.restock_on FROM products p LEFT JOIN stock s ON s.part_number = p.part_number')
      .all() as unknown as ProductRow[];
    for (const row of rows) {
      const product = mapRow(row, asset);
      expect(product, row.part_number).not.toBeNull();
      expect(product?.images?.[0]?.src.src).toMatch(/^\/_astro\/parts\/cutouts\//);
      expect(product?.hasOg).toBe(true);
      expect(product?.published).toBe(true);
    }
  });
});

describe('mapRow', () => {
  const base = () => {
    const { raw } = seeded();
    return raw.prepare("SELECT p.part_number, p.published, p.sort_order, p.data, s.qty, s.restock_on FROM products p LEFT JOIN stock s ON s.part_number = p.part_number WHERE p.part_number = 'LM7805'").get() as unknown as ProductRow;
  };

  it('reads the shelf count from the stock row, not the record', () => {
    const row = { ...base(), qty: 7 };
    expect(mapRow(row, asset)?.stock_qty).toBe(7);
    expect(JSON.parse(row.data).stock_qty).not.toBe(7);
  });

  it('falls back to the record when there is no stock row', () => {
    const row = { ...base(), qty: null };
    expect(mapRow(row, asset)?.stock_qty).toBe(JSON.parse(row.data).stock_qty);
  });

  it('takes the restock date from the stock row', () => {
    expect(mapRow({ ...base(), qty: 0, restock_on: '2026-11-12' }, asset)?.restock_on).toBe('2026-11-12');
    expect(mapRow({ ...base(), qty: 5, restock_on: null }, asset)?.restock_on).toBeUndefined();
  });

  it('keeps an unpublished product out of the published set', () => {
    expect(mapRow({ ...base(), published: 0 }, asset)?.published).toBe(false);
  });

  it('skips a row that is not JSON, does not validate, or has the wrong key', () => {
    expect(mapRow({ ...base(), data: 'nope' }, asset)).toBeNull();
    expect(mapRow({ ...base(), data: '{"part_number":"LM7805"}' }, asset)).toBeNull();
    expect(mapRow({ ...base(), part_number: 'OTHER' }, asset)).toBeNull();
  });

  it('serves an uploaded photo from /media and drops an unknown build asset', () => {
    const row = base();
    const data = JSON.parse(row.data);
    data.images = [
      { src: 'media:lm7805-ab12cd', alt: 'A photo', width: 800, height: 600 },
      { src: 'asset:parts/missing.webp', alt: 'Gone' },
    ];
    const product = mapRow({ ...row, data: JSON.stringify(data) }, () => null);
    expect(product?.images).toHaveLength(1);
    expect(product?.images?.[0]?.src.src).toBe('/media/lm7805-ab12cd-1024.webp');
    expect(product?.images?.[0]?.src.width).toBe(800);
    expect(product?.hasOg).toBe(false);
  });
});

describe('media references', () => {
  it('round-trips a key and rejects anything unsafe', () => {
    expect(parseMediaRef('media:lm7805-ab12cd')).toBe('lm7805-ab12cd');
    for (const bad of ['media:../x', 'media:UP', 'media:a b', 'media:', 'asset:x', 'media:ab']) expect(parseMediaRef(bad)).toBeNull();
    expect(mediaUrl('lm7805-ab12cd', 112)).toBe('/media/lm7805-ab12cd-112.webp');
    expect(mediaSource('lm7805-ab12cd').remote).toBe(true);
  });
});

describe('fromBuildRecord', () => {
  it('uses the live shelf row when there is one', () => {
    const data = JSON.parse(readFileSync('src/content/components/lm7805.json', 'utf8'));
    expect(fromBuildRecord(data, 3, { qty: 2, restock_on: null }).stock_qty).toBe(2);
    expect(fromBuildRecord(data, 3, undefined).stock_qty).toBe(data.stock_qty);
    expect(fromBuildRecord(data, 3, undefined).sort_order).toBe(3);
  });
});

describe('stock helpers', () => {
  it('parses counts and dates strictly', () => {
    expect(parseQty('12')).toBe(12);
    expect(parseQty(' 0 ')).toBe(0);
    for (const bad of ['', '-1', '1.5', 'x', '1e3', '99999999']) expect(parseQty(bad)).toBeNull();
    expect(parseRestockDate('')).toBeNull();
    expect(parseRestockDate('2026-11-12')).toBe('2026-11-12');
    expect(parseRestockDate('2026-02-31')).toBeUndefined();
    expect(parseRestockDate('12 Nov')).toBeUndefined();
  });

  it('lists out of stock, then low, then the rest', () => {
    const records = [
      { part_number: 'A', qty: 50, restock_on: null },
      { part_number: 'B', qty: 0, restock_on: null },
      { part_number: 'C', qty: 4, restock_on: null },
      { part_number: 'Z', qty: 1, restock_on: null },
    ];
    const products = ['A', 'B', 'C'].map((part_number) => ({ part_number, name: part_number, published: true }));
    expect(stockEntries(records, products).map((entry) => `${entry.part_number}:${entry.level}`)).toEqual(['B:out', 'C:low', 'A:ok']);
  });
});

describe('setStock', () => {
  it('sets the count, clears the date above zero and writes an audit row', async () => {
    const { db, raw } = createDb();
    raw.prepare("UPDATE stock SET restock_on = '2026-11-12' WHERE part_number = 'LM7805'").run();
    const before = stockOf(raw, 'LM7805');
    const result = await setStock(db, { partNumber: 'LM7805', expected: String(before), qty: '60', restockOn: '2026-12-01', actor: 'owner' });
    expect(result).toEqual({ ok: true, part_number: 'LM7805', from: before, to: 60 });
    expect(raw.prepare("SELECT qty, restock_on FROM stock WHERE part_number = 'LM7805'").get()).toEqual({ qty: 60, restock_on: null });
    expect(raw.prepare('SELECT action, target, detail_json FROM audit_log').all()).toEqual([
      { action: 'stock.set', target: 'LM7805', detail_json: JSON.stringify({ from: before, to: 60 }) },
    ]);
  });

  it('keeps the restock date only while the count is zero', async () => {
    const { db, raw } = createDb();
    const before = stockOf(raw, 'NE555');
    const result = await setStock(db, { partNumber: 'NE555', expected: String(before), qty: '0', restockOn: '2026-11-12', actor: 'owner' });
    expect(result.ok).toBe(true);
    expect(raw.prepare("SELECT qty, restock_on FROM stock WHERE part_number = 'NE555'").get()).toEqual({ qty: 0, restock_on: '2026-11-12' });
  });

  it('refuses to overwrite a count that changed under the owner', async () => {
    const { db, raw } = createDb();
    const seen = stockOf(raw, 'LM7805');
    raw.prepare("UPDATE stock SET qty = qty - 5 WHERE part_number = 'LM7805'").run();
    const result = await setStock(db, { partNumber: 'LM7805', expected: String(seen), qty: '100', restockOn: '', actor: 'owner' });
    expect(result).toEqual({ ok: false, reason: 'stale', part_number: 'LM7805' });
    expect(stockOf(raw, 'LM7805')).toBe(seen - 5);
    expect(raw.prepare('SELECT COUNT(*) AS n FROM audit_log').get()).toEqual({ n: 0 });
  });

  it('refuses a bad count, a bad date and an unknown part', async () => {
    const { db, raw } = createDb();
    const seen = String(stockOf(raw, 'LM7805'));
    expect((await setStock(db, { partNumber: 'LM7805', expected: seen, qty: '-3', restockOn: '', actor: 'owner' })).ok).toBe(false);
    expect(await setStock(db, { partNumber: 'LM7805', expected: seen, qty: '3', restockOn: '31/12', actor: 'owner' })).toEqual({ ok: false, reason: 'invalid-date', part_number: 'LM7805' });
    expect(await setStock(db, { partNumber: 'NOPE', expected: '1', qty: '3', restockOn: '', actor: 'owner' })).toEqual({ ok: false, reason: 'missing', part_number: 'NOPE' });
    expect(stockOf(raw, 'LM7805')).toBe(Number(seen));
  });
});
