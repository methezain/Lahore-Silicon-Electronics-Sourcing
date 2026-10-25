import { describe, expect, it } from 'vitest';
import { axisLabel, dayStartUtc, fillDays, niceMax, overview, shiftDay, zoneOffsetMinutes } from '../../src/lib/admin/stats';
import { createDb, seedOrder } from './helpers/sqlite-d1';

describe('zone helpers', () => {
  it('knows Karachi is five hours ahead all year', () => {
    expect(zoneOffsetMinutes(new Date('2026-01-15T00:00:00Z'))).toBe(300);
    expect(zoneOffsetMinutes(new Date('2026-07-15T12:00:00Z'))).toBe(300);
  });

  it('starts a local day at 19:00 UTC the day before', () => {
    expect(dayStartUtc('2026-10-25').toISOString()).toBe('2026-10-24T19:00:00.000Z');
    expect(dayStartUtc('2026-11-01').toISOString()).toBe('2026-10-31T19:00:00.000Z');
    expect(dayStartUtc('2027-01-01').toISOString()).toBe('2026-12-31T19:00:00.000Z');
  });

  it('shifts days across month and year ends', () => {
    expect(shiftDay('2026-11-01', -1)).toBe('2026-10-31');
    expect(shiftDay('2027-01-01', -1)).toBe('2026-12-31');
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('fills missing days with zeros, oldest first', () => {
    const days = fillDays([{ day: '2026-10-24', sales: 500, orders: 1 }], '2026-10-24', 3);
    expect(days).toEqual([
      { day: '2026-10-22', sales: 0, orders: 0 },
      { day: '2026-10-23', sales: 0, orders: 0 },
      { day: '2026-10-24', sales: 500, orders: 1 },
    ]);
  });

  it('rounds the chart top to a tidy value', () => {
    expect(niceMax(0)).toBe(1000);
    expect(niceMax(47000)).toBe(50000);
    expect(niceMax(61000)).toBe(80000);
    expect(niceMax(1250)).toBe(2000);
    expect(niceMax(2300)).toBe(4000);
    expect(axisLabel(0)).toBe('0');
    expect(axisLabel(2500)).toBe('2.5k');
    expect(niceMax(100000)).toBe(100000);
    expect(axisLabel(50000)).toBe('50k');
    expect(axisLabel(500)).toBe('500');
  });
});

describe('overview', () => {
  it('splits orders at Karachi midnight, not UTC midnight', async () => {
    const { db, raw } = createDb();
    const now = new Date('2026-10-24T20:00:00Z');
    seedOrder(raw, { id: 'A', status: 'Paid', total: 100, created_at: '2026-10-24 18:59:59' });
    seedOrder(raw, { id: 'B', status: 'Paid', total: 200, created_at: '2026-10-24 19:00:00' });
    seedOrder(raw, { id: 'C', status: 'Delivered', total: 300, created_at: '2026-10-24 23:30:00' });
    const result = await overview(db, now);
    expect(result.today.key).toBe('2026-10-25');
    expect(result.today.confirmedSales).toBe(500);
    expect(result.today.booked).toBe(2);
    const last = result.days[result.days.length - 1];
    const before = result.days[result.days.length - 2];
    expect(last).toEqual({ day: '2026-10-25', sales: 500, orders: 2 });
    expect(before).toEqual({ day: '2026-10-24', sales: 100, orders: 1 });
  });

  it('keeps the month tile to the calendar month in Karachi', async () => {
    const { db, raw } = createDb();
    const now = new Date('2026-11-01T02:00:00Z');
    seedOrder(raw, { id: 'A', status: 'Paid', total: 100, created_at: '2026-10-31 18:30:00' });
    seedOrder(raw, { id: 'B', status: 'Paid', total: 250, created_at: '2026-10-31 19:30:00' });
    const result = await overview(db, now);
    expect(result.today.key).toBe('2026-11-01');
    expect(result.monthSales).toBe(250);
    expect(result.weekSales).toBe(350);
    expect(result.rangeSales).toBe(350);
  });

  it('counts only confirmed money, and excludes Cancelled from booked orders', async () => {
    const { db, raw } = createDb();
    const now = new Date('2026-10-24T08:00:00Z');
    seedOrder(raw, { id: 'P', status: 'Pending', total: 100, created_at: '2026-10-24 05:00:00' });
    seedOrder(raw, { id: 'C', status: 'Cancelled', total: 700, created_at: '2026-10-24 05:00:00' });
    seedOrder(raw, { id: 'D', status: 'Dispatched', total: 400, created_at: '2026-10-24 05:00:00' });
    const result = await overview(db, now);
    expect(result.today.booked).toBe(2);
    expect(result.today.confirmedSales).toBe(400);
    expect(result.awaiting.count).toBe(1);
    expect(result.toDispatch).toBe(0);
  });

  it('counts awaiting and to-dispatch, and the age of the oldest unpaid order', async () => {
    const { db, raw } = createDb();
    const now = new Date('2026-10-24T12:00:00Z');
    seedOrder(raw, { id: 'P1', status: 'Pending', created_at: '2026-10-23 09:30:00' });
    seedOrder(raw, { id: 'P2', status: 'Pending', created_at: '2026-10-24 10:00:00' });
    seedOrder(raw, { id: 'K1', status: 'Paid', created_at: '2026-10-24 10:00:00' });
    seedOrder(raw, { id: 'K2', status: 'Paid', created_at: '2026-10-24 11:00:00' });
    const result = await overview(db, now);
    expect(result.awaiting).toEqual({ count: 2, oldestHours: 26 });
    expect(result.toDispatch).toBe(2);
  });

  it('ranks parts by units sold and ignores cancelled orders and broken lines', async () => {
    const { db, raw } = createDb();
    const now = new Date('2026-10-24T12:00:00Z');
    seedOrder(raw, { id: 'A', status: 'Paid', created_at: '2026-10-20 10:00:00', items: [{ part_number: 'LM7805', quantity: 5 }, { part_number: 'NE555', quantity: 2 }] });
    seedOrder(raw, { id: 'B', status: 'Delivered', created_at: '2026-10-21 10:00:00', items: [{ part_number: 'NE555', quantity: 4 }] });
    seedOrder(raw, { id: 'C', status: 'Cancelled', created_at: '2026-10-21 10:00:00', items: [{ part_number: 'HC-SR04', quantity: 99 }] });
    seedOrder(raw, { id: 'D', status: 'Paid', created_at: '2026-10-21 10:00:00' });
    raw.prepare("UPDATE Orders SET items_json = 'broken' WHERE id = 'D'").run();
    seedOrder(raw, { id: 'E', status: 'Paid', created_at: '2026-08-01 10:00:00', items: [{ part_number: 'DS18B20', quantity: 50 }] });
    const result = await overview(db, now);
    expect(result.topParts).toEqual([
      { part_number: 'NE555', units: 6 },
      { part_number: 'LM7805', units: 5 },
    ]);
  });

  it('lists the five latest orders and low stock first', async () => {
    const { db, raw } = createDb();
    for (let i = 1; i <= 7; i += 1) seedOrder(raw, { id: `O${i}`, created_at: `2026-10-0${i} 10:00:00` });
    raw.prepare("UPDATE stock SET qty = 0 WHERE part_number = 'NE555'").run();
    raw.prepare("UPDATE stock SET qty = 4 WHERE part_number = 'LM7805'").run();
    const result = await overview(db, new Date('2026-10-10T00:00:00Z'));
    expect(result.recent.map((row) => row.id)).toEqual(['O7', 'O6', 'O5', 'O4', 'O3']);
    expect(result.lowStock.slice(0, 2)).toEqual([
      { part_number: 'NE555', qty: 0 },
      { part_number: 'LM7805', qty: 4 },
    ]);
    expect(result.lowStock.every((row) => row.qty <= 10)).toBe(true);
  });

  it('matches a hand count over thirty days', async () => {
    const { db, raw } = createDb();
    const now = new Date('2026-10-24T12:00:00Z');
    let hand = 0;
    for (let i = 0; i < 40; i += 1) {
      const date = new Date(now.getTime() - i * 86400000);
      const stamp = date.toISOString().slice(0, 19).replace('T', ' ');
      const total = 100 + i;
      seedOrder(raw, { id: `H${i}`, status: i % 7 === 0 ? 'Cancelled' : 'Paid', total, created_at: stamp });
      if (i % 7 !== 0 && i < 30) hand += total;
    }
    const result = await overview(db, now);
    expect(result.rangeSales).toBe(hand);
    expect(result.days).toHaveLength(30);
  });
});
