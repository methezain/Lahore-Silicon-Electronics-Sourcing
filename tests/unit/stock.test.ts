import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOW_STOCK_AT,
  formatRestockDate,
  meterOnCount,
  stockLabel,
  stockLevel,
} from '../../src/lib/stock';

describe('stockLevel', () => {
  it('uses the default threshold of 10', () => {
    expect(DEFAULT_LOW_STOCK_AT).toBe(10);
    expect(stockLevel(11)).toBe('ok');
    expect(stockLevel(16)).toBe('ok');
    expect(stockLevel(10)).toBe('low');
    expect(stockLevel(9)).toBe('low');
    expect(stockLevel(1)).toBe('low');
  });

  it('treats zero and non-integers as out', () => {
    expect(stockLevel(0)).toBe('out');
    expect(stockLevel(-1)).toBe('out');
    expect(stockLevel(1.5)).toBe('out');
  });

  it('honors a part threshold', () => {
    expect(stockLevel(16, 20)).toBe('low');
    expect(stockLevel(21, 20)).toBe('ok');
  });

  it('rejects a bad threshold', () => {
    expect(() => stockLevel(4, -1)).toThrow(/low_stock_at/);
    expect(() => stockLevel(4, 1.5)).toThrow(/low_stock_at/);
  });
});

describe('stockLabel', () => {
  it('names the count', () => {
    expect(stockLabel(48)).toBe('48 in stock');
    expect(stockLabel(9)).toBe('9 in stock');
  });

  it('omits a date the catalog does not have', () => {
    expect(stockLabel(0)).toBe('Out of stock');
    expect(stockLabel(0, 'soon')).toBe('Out of stock');
  });

  it('formats a real ISO restock date', () => {
    expect(formatRestockDate('2026-11-12')).toBe('12 Nov 2026');
    expect(stockLabel(0, '2026-11-12')).toBe('Out of stock, back around 12 Nov 2026');
    expect(formatRestockDate('2026-13-01')).toBeUndefined();
    expect(formatRestockDate('2026-11-00')).toBeUndefined();
  });
});

describe('meterOnCount', () => {
  it('fills one segment per 10% of the shelf', () => {
    expect(meterOnCount(0, 20)).toBe(0);
    expect(meterOnCount(1, 100)).toBe(1);
    expect(meterOnCount(8, 20)).toBe(4);
    expect(meterOnCount(80, 80)).toBe(10);
    expect(meterOnCount(100, 80)).toBe(10);
  });

  it('fills nothing without a shelf quantity', () => {
    expect(meterOnCount(48, 0)).toBe(0);
    expect(meterOnCount(48, -5)).toBe(0);
  });
});
