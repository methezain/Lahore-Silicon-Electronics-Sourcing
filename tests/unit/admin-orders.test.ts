import { describe, expect, it } from 'vitest';
import { csvCell, neutralise, toCsv } from '../../src/lib/admin/csv';
import { canMove, nextStatuses, restockByDefault, timelineSteps } from '../../src/lib/admin/order-status';
import { changeStatus, getOrder, listOrders, parseOrdersQuery, saveNote, statusCounts } from '../../src/lib/admin/orders';
import { createDb, seedOrder, stockOf } from './helpers/sqlite-d1';

const query = (params = '') => parseOrdersQuery(new URLSearchParams(params));

describe('status rules', () => {
  it('allows only the steps in the plan', () => {
    expect(nextStatuses('Pending')).toEqual(['Paid', 'Cancelled']);
    expect(nextStatuses('Paid')).toEqual(['Dispatched', 'Cancelled']);
    expect(nextStatuses('Dispatched')).toEqual(['Delivered']);
    expect(nextStatuses('Delivered')).toEqual([]);
    expect(nextStatuses('Cancelled')).toEqual([]);
    expect(nextStatuses('Mystery')).toEqual([]);
  });

  it('refuses every other move', () => {
    const all = ['Pending', 'Paid', 'Dispatched', 'Delivered', 'Cancelled'];
    const allowed = new Set(['Pending>Paid', 'Pending>Cancelled', 'Paid>Dispatched', 'Paid>Cancelled', 'Dispatched>Delivered']);
    for (const from of all) {
      for (const to of all) expect(canMove(from, to)).toBe(allowed.has(`${from}>${to}`));
    }
  });

  it('restocks by default only before dispatch', () => {
    expect(restockByDefault('Pending')).toBe(true);
    expect(restockByDefault('Paid')).toBe(true);
    expect(restockByDefault('Dispatched')).toBe(false);
  });

  it('draws a timeline that ends at the current step', () => {
    expect(timelineSteps('Paid').map((step) => step.state)).toEqual(['done', 'done', 'now', 'todo', 'todo']);
    expect(timelineSteps('Delivered').every((step) => step.state === 'done')).toBe(true);
    expect(timelineSteps('Cancelled').map((step) => step.label)).toEqual(['Order placed', 'Cancelled']);
  });
});

describe('changeStatus', () => {
  it('moves an order, writes an event and an audit row, and leaves stock alone', async () => {
    const { db, raw } = createDb();
    seedOrder(raw, { id: 'LHR-1' });
    const before = stockOf(raw, 'LM7805');
    const result = await changeStatus(db, { id: 'LHR-1', expected: 'Pending', to: 'Paid', restock: false, actor: 'owner' });
    expect(result).toEqual({ ok: true, from: 'Pending', to: 'Paid', restocked: false });
    expect(raw.prepare("SELECT status, updated_at FROM Orders WHERE id = 'LHR-1'").get()).toMatchObject({ status: 'Paid' });
    expect(raw.prepare('SELECT from_status, to_status, restocked, actor FROM order_events').all()).toEqual([
      { from_status: 'Pending', to_status: 'Paid', restocked: 0, actor: 'owner' },
    ]);
    expect(raw.prepare('SELECT action, target, detail_json FROM audit_log').all()).toEqual([
      { action: 'order.status', target: 'LHR-1', detail_json: '{"from":"Pending","to":"Paid","restocked":false}' },
    ]);
    expect(stockOf(raw, 'LM7805')).toBe(before);
  });

  it('walks an order to Delivered', async () => {
    const { db, raw } = createDb();
    seedOrder(raw, { id: 'LHR-1' });
    for (const [expected, to] of [['Pending', 'Paid'], ['Paid', 'Dispatched'], ['Dispatched', 'Delivered']]) {
      expect((await changeStatus(db, { id: 'LHR-1', expected: expected!, to: to!, restock: false, actor: 'owner' })).ok).toBe(true);
    }
    expect((await getOrder(db, 'LHR-1'))?.order.status).toBe('Delivered');
    expect((await getOrder(db, 'LHR-1'))?.events).toHaveLength(3);
  });

  it('refuses a skipped step, a final status and an unknown order', async () => {
    const { db, raw } = createDb();
    seedOrder(raw, { id: 'LHR-1' });
    seedOrder(raw, { id: 'LHR-2', status: 'Delivered' });
    expect(await changeStatus(db, { id: 'LHR-1', expected: 'Pending', to: 'Delivered', restock: false, actor: 'owner' })).toEqual({ ok: false, reason: 'invalid' });
    expect(await changeStatus(db, { id: 'LHR-2', expected: 'Delivered', to: 'Cancelled', restock: true, actor: 'owner' })).toEqual({ ok: false, reason: 'invalid' });
    expect(await changeStatus(db, { id: 'LHR-9', expected: 'Pending', to: 'Paid', restock: false, actor: 'owner' })).toEqual({ ok: false, reason: 'missing' });
    expect(await changeStatus(db, { id: 'LHR-1', expected: 'Pending', to: 'Bogus', restock: false, actor: 'owner' })).toEqual({ ok: false, reason: 'invalid' });
    expect(raw.prepare('SELECT COUNT(*) AS n FROM order_events').get()).toEqual({ n: 0 });
  });

  it('a second click from the same screen is stale and changes nothing', async () => {
    const { db, raw } = createDb();
    seedOrder(raw, { id: 'LHR-1' });
    const first = await changeStatus(db, { id: 'LHR-1', expected: 'Pending', to: 'Paid', restock: false, actor: 'owner' });
    const second = await changeStatus(db, { id: 'LHR-1', expected: 'Pending', to: 'Paid', restock: false, actor: 'owner' });
    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, reason: 'stale' });
    expect(raw.prepare('SELECT COUNT(*) AS n FROM order_events').get()).toEqual({ n: 1 });
    expect(raw.prepare('SELECT COUNT(*) AS n FROM audit_log').get()).toEqual({ n: 1 });
  });

  it('cancel with restock puts every line back once', async () => {
    const { db, raw } = createDb();
    const items = [{ part_number: 'LM7805', quantity: 3 }, { part_number: 'NE555', quantity: 4 }];
    seedOrder(raw, { id: 'LHR-1', items });
    const lm = stockOf(raw, 'LM7805');
    const ne = stockOf(raw, 'NE555');
    const result = await changeStatus(db, { id: 'LHR-1', expected: 'Pending', to: 'Cancelled', restock: true, actor: 'owner' });
    expect(result).toEqual({ ok: true, from: 'Pending', to: 'Cancelled', restocked: true });
    expect(stockOf(raw, 'LM7805')).toBe(lm + 3);
    expect(stockOf(raw, 'NE555')).toBe(ne + 4);
    const again = await changeStatus(db, { id: 'LHR-1', expected: 'Pending', to: 'Cancelled', restock: true, actor: 'owner' });
    expect(again).toEqual({ ok: false, reason: 'stale' });
    expect(stockOf(raw, 'LM7805')).toBe(lm + 3);
    expect(raw.prepare('SELECT restocked FROM order_events').get()).toEqual({ restocked: 1 });
  });

  it('cancel without restock leaves stock alone', async () => {
    const { db, raw } = createDb();
    seedOrder(raw, { id: 'LHR-1' });
    const before = stockOf(raw, 'LM7805');
    const result = await changeStatus(db, { id: 'LHR-1', expected: 'Paid', to: 'Cancelled', restock: false, actor: 'owner' });
    expect(result.ok).toBe(false);
    raw.prepare("UPDATE Orders SET status = 'Paid'").run();
    const ok = await changeStatus(db, { id: 'LHR-1', expected: 'Paid', to: 'Cancelled', restock: false, actor: 'owner' });
    expect(ok).toEqual({ ok: true, from: 'Paid', to: 'Cancelled', restocked: false });
    expect(stockOf(raw, 'LM7805')).toBe(before);
  });

  it('restock never applies to a move that is not a cancel', async () => {
    const { db, raw } = createDb();
    seedOrder(raw, { id: 'LHR-1' });
    const before = stockOf(raw, 'LM7805');
    const result = await changeStatus(db, { id: 'LHR-1', expected: 'Pending', to: 'Paid', restock: true, actor: 'owner' });
    expect(result).toEqual({ ok: true, from: 'Pending', to: 'Paid', restocked: false });
    expect(stockOf(raw, 'LM7805')).toBe(before);
  });

  it('rolls everything back when the batch fails', async () => {
    const { db, raw } = createDb();
    seedOrder(raw, { id: 'LHR-1' });
    raw.exec('DROP TABLE order_events');
    const result = await changeStatus(db, { id: 'LHR-1', expected: 'Pending', to: 'Paid', restock: false, actor: 'owner' });
    expect(result).toEqual({ ok: false, reason: 'failed' });
    expect(raw.prepare("SELECT status FROM Orders WHERE id = 'LHR-1'").get()).toEqual({ status: 'Pending' });
  });
});

describe('saveNote', () => {
  it('stores a trimmed note and an audit row without the text', async () => {
    const { db, raw } = createDb();
    seedOrder(raw, { id: 'LHR-1' });
    expect(await saveNote(db, { id: 'LHR-1', note: '  call before 5  ', actor: 'owner' })).toEqual({ ok: true });
    expect(raw.prepare('SELECT admin_note FROM Orders').get()).toEqual({ admin_note: 'call before 5' });
    expect(raw.prepare('SELECT detail_json FROM audit_log').get()).toEqual({ detail_json: '{"length":13}' });
  });

  it('refuses a long note and an unknown order', async () => {
    const { db, raw } = createDb();
    seedOrder(raw, { id: 'LHR-1' });
    expect(await saveNote(db, { id: 'LHR-1', note: 'x'.repeat(501), actor: 'owner' })).toEqual({ ok: false, reason: 'too-long' });
    expect(await saveNote(db, { id: 'LHR-9', note: 'hi', actor: 'owner' })).toEqual({ ok: false, reason: 'missing' });
    expect(raw.prepare('SELECT COUNT(*) AS n FROM audit_log').get()).toEqual({ n: 0 });
  });
});

describe('listing', () => {
  function seeded() {
    const made = createDb();
    for (let i = 1; i <= 30; i += 1) {
      const status = i <= 4 ? 'Pending' : i <= 9 ? 'Paid' : i <= 12 ? 'Dispatched' : i <= 29 ? 'Delivered' : 'Cancelled';
      seedOrder(made.raw, {
        id: `LHR-${String(i).padStart(3, '0')}`,
        status,
        name: i === 7 ? 'Sana Iqbal' : `Buyer ${i}`,
        phone: i === 7 ? '+923331112222' : '+923001234567',
        created_at: `2026-10-${String(i).padStart(2, '0')} 08:00:00`,
      });
    }
    return made;
  }

  it('counts by status', async () => {
    const { db } = seeded();
    expect(await statusCounts(db)).toEqual({ all: 30, Pending: 4, Paid: 5, Dispatched: 3, Delivered: 17, Cancelled: 1 });
  });

  it('pages twelve at a time, newest first', async () => {
    const { db } = seeded();
    const first = await listOrders(db, query());
    expect(first.total).toBe(30);
    expect(first.pages).toBe(3);
    expect(first.rows).toHaveLength(12);
    expect(first.rows[0]?.id).toBe('LHR-030');
    const last = await listOrders(db, query('page=3'));
    expect(last.rows.map((row) => row.id)).toEqual(['LHR-006', 'LHR-005', 'LHR-004', 'LHR-003', 'LHR-002', 'LHR-001']);
    expect((await listOrders(db, query('page=99'))).page).toBe(3);
  });

  it('filters by status', async () => {
    const { db } = seeded();
    const paid = await listOrders(db, query('status=Paid'));
    expect(paid.total).toBe(5);
    expect(paid.rows.every((row) => row.status === 'Paid')).toBe(true);
    expect((await listOrders(db, query('status=Nope'))).total).toBe(30);
  });

  it('finds an order by id, name or phone', async () => {
    const { db } = seeded();
    expect((await listOrders(db, query('q=LHR-007'))).rows.map((row) => row.id)).toEqual(['LHR-007']);
    expect((await listOrders(db, query('q=sana'))).rows.map((row) => row.id)).toEqual(['LHR-007']);
    expect((await listOrders(db, query('q=0333 1112222'))).rows.map((row) => row.id)).toEqual(['LHR-007']);
    expect((await listOrders(db, query('q=1112222'))).rows.map((row) => row.id)).toEqual(['LHR-007']);
    expect((await listOrders(db, query('q=zzz'))).total).toBe(0);
  });

  it('treats % and _ in a search as plain characters', async () => {
    const { db } = seeded();
    expect((await listOrders(db, query('q=%25'))).total).toBe(0);
    expect((await listOrders(db, query('q=LHR_00'))).total).toBe(0);
  });

  it('counts lines and survives a broken items_json', async () => {
    const { db, raw } = createDb();
    seedOrder(raw, { id: 'LHR-1', items: [{ part_number: 'LM7805', quantity: 1 }, { part_number: 'NE555', quantity: 1 }] });
    seedOrder(raw, { id: 'LHR-2' });
    raw.prepare("UPDATE Orders SET items_json = 'not json' WHERE id = 'LHR-2'").run();
    const rows = (await listOrders(db, query())).rows;
    expect(rows.find((row) => row.id === 'LHR-1')?.lines).toBe(2);
    expect(rows.find((row) => row.id === 'LHR-2')?.lines).toBe(0);
  });
});

describe('csv', () => {
  it('neutralises cells a spreadsheet would run', () => {
    for (const value of ['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx']) expect(neutralise(value)).toBe(`'${value}`);
    expect(neutralise('Bilal')).toBe('Bilal');
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
  });

  it('quotes commas, quotes and newlines and starts with a BOM', () => {
    const out = toCsv(['Name', 'Address'], [['A, B', 'line1\nline2'], ['say "hi"', 3]]);
    expect(out.startsWith('﻿')).toBe(true);
    expect(out).toContain('Name,Address\r\n');
    expect(out).toContain('"A, B","line1\nline2"');
    expect(out).toContain('"say ""hi""",3');
  });
});
