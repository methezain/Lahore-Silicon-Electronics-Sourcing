import { describe, expect, it } from 'vitest';
import { correctQuantity, quantityPresets, type QtyRule } from '../../src/lib/quantity';

const rule: QtyRule = { min_qty: 1, qty_multiple: 1, stock_qty: 10 };

describe('correctQuantity', () => {
  it('stops at an empty drawer', () => {
    expect(correctQuantity(4, { ...rule, stock_qty: 0 })).toEqual({
      quantity: 0,
      message: 'Only 0 in stock',
    });
  });

  it('replaces a non-integer with the minimum that fits', () => {
    expect(correctQuantity(1.5, rule)).toEqual({
      quantity: 1,
      message: 'Quantity must be a positive integer.',
    });
    expect(correctQuantity(0, { ...rule, min_qty: 2, stock_qty: 10 })).toEqual({
      quantity: 2,
      message: 'Quantity must be a positive integer.',
    });
  });

  it('raises a short quantity to the minimum', () => {
    expect(correctQuantity(1, { ...rule, min_qty: 5 })).toEqual({
      quantity: 5,
      message: 'Minimum quantity is 5.',
    });
  });

  it('caps a quantity at stock', () => {
    expect(correctQuantity(12, rule)).toEqual({
      quantity: 10,
      message: 'Only 10 in stock',
    });
    expect(correctQuantity(4, { min_qty: 10, qty_multiple: 1, stock_qty: 5 })).toEqual({
      quantity: 5,
      message: 'Only 5 in stock',
    });
  });

  it('rounds a non-multiple down, then to a multiple that fits', () => {
    expect(correctQuantity(7, { min_qty: 1, qty_multiple: 5, stock_qty: 100 })).toEqual({
      quantity: 5,
      message: 'Quantity must be a multiple of 5.',
    });
    // A quantity below one step falls through to the largest multiple that fits in stock.
    expect(correctQuantity(3, { min_qty: 1, qty_multiple: 5, stock_qty: 100 })).toEqual({
      quantity: 100,
      message: 'Quantity must be a multiple of 5.',
    });
    expect(correctQuantity(12, { min_qty: 1, qty_multiple: 5, stock_qty: 9 })).toEqual({
      quantity: 5,
      message: 'Quantity must be a multiple of 5.',
    });
  });

  it('treats a multiple of zero as steps of one', () => {
    expect(correctQuantity(4, { ...rule, qty_multiple: 0 })).toEqual({ quantity: 4, message: undefined });
  });
});

describe('quantityPresets', () => {
  it('offers 1, 5, 10 and 25 when the shelf can fill them', () => {
    expect(quantityPresets({ min_qty: 1, qty_multiple: 1, stock_qty: 48 })).toEqual([1, 5, 10, 25]);
  });

  it('drops presets above stock', () => {
    expect(quantityPresets({ min_qty: 1, qty_multiple: 1, stock_qty: 9 })).toEqual([1, 5]);
    expect(quantityPresets({ min_qty: 1, qty_multiple: 1, stock_qty: 3 })).toEqual([1]);
    expect(quantityPresets({ min_qty: 1, qty_multiple: 1, stock_qty: 0 })).toEqual([]);
  });

  it('keeps only presets that already match the minimum and the multiple', () => {
    expect(quantityPresets({ min_qty: 5, qty_multiple: 1, stock_qty: 30 })).toEqual([5, 10, 25]);
    expect(quantityPresets({ min_qty: 1, qty_multiple: 5, stock_qty: 25 })).toEqual([5, 10, 25]);
  });
});
