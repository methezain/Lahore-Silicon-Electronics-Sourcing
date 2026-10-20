import { describe, expect, it } from 'vitest';
import {
  assertIntegerPkr,
  formatPkr,
  lineTotal,
  priceCart,
  quoteOrder,
  unitPrice,
  type CatalogPrice,
} from '../../src/lib/money';

const part: CatalogPrice = {
  part_number: 'PART-1',
  name: 'Fixture',
  price: 1250,
  breaks: [
    { min_qty: 10, unit_price: 1100 },
    { min_qty: 50, unit_price: 1000 },
  ],
};

describe('assertIntegerPkr', () => {
  it('accepts zero and a positive integer', () => {
    expect(assertIntegerPkr(0)).toBe(0);
    expect(assertIntegerPkr(1250)).toBe(1250);
  });

  it('rejects fractions and negatives', () => {
    expect(() => assertIntegerPkr(12.5)).toThrow(/integer/);
    expect(() => assertIntegerPkr(-1)).toThrow(/integer/);
  });
});

describe('unitPrice', () => {
  it('uses the shelf price when no break applies', () => {
    expect(unitPrice(part, 1)).toBe(1250);
    expect(unitPrice(part, 9)).toBe(1250);
    expect(unitPrice({ price: 40 }, 3)).toBe(40);
  });

  it('uses the greatest break at or below the quantity, in any list order', () => {
    expect(unitPrice(part, 10)).toBe(1100);
    expect(unitPrice(part, 49)).toBe(1100);
    expect(unitPrice(part, 50)).toBe(1000);
    const reversed: CatalogPrice = {
      ...part,
      breaks: [
        { min_qty: 50, unit_price: 1000 },
        { min_qty: 10, unit_price: 1100 },
      ],
    };
    expect(unitPrice(reversed, 50)).toBe(1000);
  });

  it('rejects a bad quantity or a bad break', () => {
    expect(() => unitPrice(part, 0)).toThrow(/positive integer/);
    expect(() => unitPrice(part, 1.5)).toThrow(/positive integer/);
    expect(() => unitPrice({ price: 10.5 }, 1)).toThrow(/integer/);
    expect(() => unitPrice({ price: 10, breaks: [{ min_qty: 0, unit_price: 8 }] }, 1)).toThrow(/positive integer/);
  });
});

describe('lineTotal and formatPkr', () => {
  it('multiplies the unit price by the quantity', () => {
    expect(lineTotal(part, 10)).toBe(11000);
  });

  it('formats grouped rupees with no decimals', () => {
    expect(formatPkr(1250)).toBe('Rs 1,250');
    expect(formatPkr(0)).toBe('Rs 0');
    expect(formatPkr(1_000_000)).toBe('Rs 1,000,000');
  });
});

describe('priceCart', () => {
  it('merges lines so a break sees the real quantity', () => {
    const priced = priceCart(partCatalog(), [
      { part_number: 'PART-1', quantity: 6 },
      { part_number: 'PART-1', quantity: 4 },
    ]);
    expect(priced.lines).toEqual([
      {
        part_number: 'PART-1',
        name: 'Fixture',
        price: 1100,
        quantity: 10,
        line_total: 11000,
      },
    ]);
    expect(priced.total).toBe(11000);
    expect(priced.missing).toEqual([]);
    expect(priced.invalid).toEqual([]);
  });

  it('ignores a price sent on the line', () => {
    const line = { part_number: 'PART-1', quantity: 1, price: 1 };
    expect(priceCart(partCatalog(), [line]).lines[0]?.price).toBe(1250);
  });

  it('reports a missing part and an invalid quantity', () => {
    const priced = priceCart(partCatalog(), [
      { part_number: 'PART-1', quantity: 0 },
      { part_number: 'PART-1', quantity: 2 },
      { part_number: 'MISSING', quantity: 1 },
    ]);
    expect(priced.lines).toEqual([]);
    expect(priced.invalid).toEqual(['PART-1']);
    expect(priced.missing).toEqual(['MISSING']);
    expect(priced.total).toBe(0);
  });
});

describe('quoteOrder', () => {
  it('accepts the catalog total', () => {
    const quote = quoteOrder(partCatalog(), [{ part_number: 'PART-1', quantity: 2 }], 2500);
    expect(quote).toEqual({
      ok: true,
      total: 2500,
      items: [
        {
          part_number: 'PART-1',
          name: 'Fixture',
          price: 1250,
          quantity: 2,
          line_total: 2500,
        },
      ],
    });
  });

  it('rejects a client total that does not match', () => {
    const quote = quoteOrder(partCatalog(), [{ part_number: 'PART-1', quantity: 1 }], 1);
    expect(quote.ok).toBe(false);
    if (!quote.ok) expect(quote.error).toBe('Order total does not match the catalog price. The total is Rs 1,250.');
  });

  it('rejects an empty cart, a bad total, a missing part, and a bad quantity', () => {
    expect(quoteOrder(partCatalog(), [], 1)).toMatchObject({ ok: false, error: 'Cart cannot be empty.' });
    expect(quoteOrder(partCatalog(), [{ part_number: 'PART-1', quantity: 1 }], 0)).toMatchObject({
      ok: false,
      error: 'Order total must be a positive integer number of PKR.',
    });
    expect(quoteOrder(partCatalog(), [{ part_number: 'NOPE', quantity: 1 }], 1250)).toMatchObject({
      ok: false,
      error: 'The shop does not sell NOPE.',
    });
    expect(quoteOrder(partCatalog(), [{ part_number: 'PART-1', quantity: -2 }], 1250)).toMatchObject({
      ok: false,
      error: 'Quantity must be a positive integer.',
    });
  });

  it('rejects a catalog price that is not integer PKR', () => {
    const quote = quoteOrder(
      [{ part_number: 'PART-1', name: 'Fixture', price: 10.5 }],
      [{ part_number: 'PART-1', quantity: 1 }],
      11,
    );
    expect(quote).toMatchObject({ ok: false, error: 'Price must be an integer number of PKR.' });
  });
});

function partCatalog(): CatalogPrice[] {
  return [part];
}
