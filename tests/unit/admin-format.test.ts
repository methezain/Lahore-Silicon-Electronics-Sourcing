import { describe, expect, it } from 'vitest';
import { dayKey, formatFull, formatPlaced, parseStamp } from '../../src/lib/admin/time';
import { buyerMessage, buyerWhatsAppHref, waDigits } from '../../src/lib/admin/whatsapp';

const order = {
  id: 'LHR-3f9a1c0d7be2a415',
  customer_name: 'Bilal Ahmed',
  phone: '+923001234567',
  total_price: 2545,
  status: 'Pending',
  payment_ref: 'TXN88412209',
  items_json: JSON.stringify([
    { part_number: 'LM7805', name: 'x', quantity: 1, price: 45, line_total: 45 },
    { part_number: 'ESP32-WROOM-32D', name: 'y', quantity: 2, price: 1250, line_total: 2500 },
  ]),
};

describe('time in Asia/Karachi', () => {
  it('parses D1 and ISO stamps as UTC', () => {
    expect(parseStamp('2026-10-24 06:00:00')?.toISOString()).toBe('2026-10-24T06:00:00.000Z');
    expect(parseStamp('2026-10-24T06:00:00.123Z')?.toISOString()).toBe('2026-10-24T06:00:00.123Z');
    expect(parseStamp('nope')).toBeNull();
    expect(parseStamp(5)).toBeNull();
  });

  it('puts 19:30 UTC on the next Karachi day', () => {
    expect(dayKey(new Date('2026-10-24T18:59:59Z'))).toBe('2026-10-24');
    expect(dayKey(new Date('2026-10-24T19:00:00Z'))).toBe('2026-10-25');
  });

  it('crosses a month boundary at 19:00 UTC', () => {
    expect(dayKey(new Date('2026-10-31T19:00:00Z'))).toBe('2026-11-01');
    expect(dayKey(new Date('2026-12-31T19:00:00Z'))).toBe('2027-01-01');
  });

  it('says Today, Yesterday or the date', () => {
    const now = new Date('2026-10-24T08:00:00Z');
    expect(formatPlaced('2026-10-24 06:42:00', now)).toBe('Today, 11:42');
    expect(formatPlaced('2026-10-23 12:03:00', now)).toBe('Yesterday, 17:03');
    expect(formatPlaced('2026-10-22 09:20:00', now)).toBe('22 Oct, 14:20');
    expect(formatPlaced(null, now)).toBe('');
  });

  it('formats a full stamp for the slip', () => {
    expect(formatFull('2026-10-22 09:20:00')).toBe('22 Oct 2026, 14:20');
  });
});

describe('buyer WhatsApp message', () => {
  it('turns the stored number into wa.me digits', () => {
    expect(waDigits('+923001234567')).toBe('923001234567');
    expect(waDigits('123')).toBeNull();
  });

  it('states only what the order proves', () => {
    const text = buyerMessage(order, 'Lahore Silicon');
    expect(text).toContain('Hi Bilal, this is Lahore Silicon.');
    expect(text).toContain('1 × LM7805, 2 × ESP32-WROOM-32D');
    expect(text).toContain('Total Rs 2,545');
    expect(text).toContain('TXN88412209');
    expect(text).not.toMatch(/tomorrow|today|days|hours|tracking/i);
  });

  it('has one sentence per status and never invents a date', () => {
    for (const status of ['Paid', 'Dispatched', 'Delivered', 'Cancelled']) {
      const text = buyerMessage({ ...order, status }, 'Lahore Silicon');
      expect(text).toContain(order.id);
      expect(text).not.toMatch(/\d{1,2} (Oct|Nov)/);
    }
  });

  it('survives unreadable lines and a missing reference', () => {
    const text = buyerMessage({ ...order, items_json: 'bad', payment_ref: null }, 'Lahore Silicon');
    expect(text).toContain('We are checking your payment.');
    expect(text).not.toContain('undefined');
  });

  it('builds an encoded link, or none for a bad phone', () => {
    const href = buyerWhatsAppHref(order, 'Lahore Silicon') ?? '';
    expect(href.startsWith('https://wa.me/923001234567?text=')).toBe(true);
    expect(decodeURIComponent(href.split('text=')[1] ?? '')).toContain(order.id);
    expect(buyerWhatsAppHref({ ...order, phone: '12' }, 'Lahore Silicon')).toBeNull();
  });
});
