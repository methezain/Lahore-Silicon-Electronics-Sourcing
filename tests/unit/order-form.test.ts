import { describe, expect, it } from 'vitest';
import { addressLine2Rule, emptyCart, nameRule, orderNotSaved, tooManyLines } from '../../src/lib/order';
import { orderFormSchema } from '../../src/lib/order-form';

const key = '11111111-1111-4111-8111-111111111111';

function fields(extra: Record<string, unknown> = {}) {
  return {
    name: 'Ali',
    phone: '03001234567',
    destination: 'Lahore',
    address: 'House 12, Mall Road',
    address_line_2: null,
    payment_ref: 'TXN12345',
    idempotency_key: key,
    'cf-turnstile-response': 'token',
    total: '50',
    items: JSON.stringify([{ part_number: 'LM7805', quantity: 1 }]),
    ...extra,
  };
}

describe('order form', () => {
  it('accepts empty controls as null and a string total', () => {
    const parsed = orderFormSchema.safeParse(fields());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.total).toBe(50);
    expect(parsed.data.items).toEqual([{ part_number: 'LM7805', quantity: 1 }]);
    expect(parsed.data.address_line_2).toBeUndefined();
    expect(parsed.data.phone).toBe('03001234567');
  });

  it('names the field when the name is too short', () => {
    const parsed = orderFormSchema.safeParse(fields({ name: null }));
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues.some((issue) => issue.path[0] === 'name' && issue.message === nameRule)).toBe(true);
  });

  it('keeps a long second address line on that field', () => {
    const parsed = orderFormSchema.safeParse(fields({ address_line_2: 'x'.repeat(121) }));
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues.some((issue) => issue.path[0] === 'address_line_2' && issue.message === addressLine2Rule)).toBe(true);
  });

  it('rejects an empty cart and a key that is not a UUID', () => {
    const empty = orderFormSchema.safeParse(fields({ items: '[]' }));
    expect(empty.success).toBe(false);
    if (!empty.success) expect(empty.error.issues[0]?.message).toBe(emptyCart);

    const badKey = orderFormSchema.safeParse(fields({ idempotency_key: 'nope' }));
    expect(badKey.success).toBe(false);
    if (!badKey.success) expect(badKey.error.issues[0]?.message).toBe(orderNotSaved);
  });

  it('rejects a cart with too many lines', () => {
    const items = Array.from({ length: 21 }, (_, index) => ({ part_number: `P${index}`, quantity: 1 }));
    const parsed = orderFormSchema.safeParse(fields({ items: JSON.stringify(items) }));
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]?.message).toBe(tooManyLines);
  });
});
