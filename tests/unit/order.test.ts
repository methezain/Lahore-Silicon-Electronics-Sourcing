import { describe, expect, it } from 'vitest';
import {
  addressLine2Rule,
  addressMessage,
  cityMessage,
  emptyCart,
  continueShopping,
  formatOrderDate,
  linesUnreadable,
  nameMessage,
  onlyInStock,
  orderCancelled,
  checkNotComplete,
  orderNotSaved,
  orderReceivedNext,
  orderReceivedTitle,
  pageMissing,
  paymentRefMessage,
  placeOrderLabel,
  priceChanged,
  receiptLines,
  receiptTimeline,
  receiptWhatsAppText,
  sendReceipt,
  serverBroke,
  showOrderLabel,
  stepStateLabel,
  tooManyLines,
  tooManyOrders,
  tryAgain,
} from '../../src/lib/order';

describe('order copy', () => {
  it('names the checkout rules', () => {
    expect(nameMessage('A')).toBe('Enter your name (at least 2 letters).');
    expect(nameMessage('12')).toBe('Enter your name (at least 2 letters).');
    expect(nameMessage('Ali')).toBeNull();
    expect(cityMessage('L')).toBe('Enter your city or area.');
    expect(cityMessage(' Lahore ')).toBeNull();
    expect(addressMessage('House 1')).toBe('Enter the full address, with house and street.');
    expect(addressMessage('House 12, Mall Road')).toBeNull();
    expect(paymentRefMessage('TXN')).toBe('Paste the transaction ID from your payment (at least 5 characters).');
    expect(paymentRefMessage(' TXN12345 ')).toBeNull();
    expect(addressLine2Rule).toBe('Address line 2 must be 120 characters or fewer.');
    expect(tooManyLines).toBe('The cart has too many lines.');
    expect(emptyCart).toBe('Cart cannot be empty.');
    expect(onlyInStock('ESP32-WROOM-32D', 9)).toBe('ESP32-WROOM-32D: only 9 in stock.');
    expect(priceChanged('Rs 2,600')).toBe('Prices changed while you were checking out. The new total is Rs 2,600.');
    expect(orderNotSaved).toBe('The order was not saved. Nothing was charged. Try again, or message us on WhatsApp.');
    expect(checkNotComplete).toBe('Complete the check before placing the order.');
    expect(tooManyOrders).toBe('Too many order attempts. Wait a minute and try again.');
    expect(placeOrderLabel('Rs 10,000')).toBe('Place order · Rs 10,000');
    expect(showOrderLabel('Rs 10,000')).toBe('Show order · Rs 10,000');
    expect(`${orderReceivedTitle}. ${orderReceivedNext}`).toBe(
      "Order received. We'll confirm your payment and dispatch.",
    );
    expect(sendReceipt).toBe('Send payment receipt on WhatsApp');
    expect(continueShopping).toBe('Continue shopping');
    expect(orderCancelled).toBe('This order was cancelled.');
    expect(linesUnreadable).toBe('The line list on this order could not be read.');
    expect(pageMissing).toBe('No page here.');
    expect(serverBroke).toBe('Something broke on our side. Your cart is saved.');
    expect(tryAgain).toBe('Try again');
  });
});

describe('receipt', () => {
  const stored = JSON.stringify([
    {
      part_number: 'ESP32-WROOM-32D',
      name: 'Wi-Fi and Bluetooth module, 3.3 V',
      price: 1250,
      quantity: 8,
      line_total: 10000,
    },
  ]);

  it('reads priced lines and drops a payload that is not a line list', () => {
    expect(receiptLines(stored)).toEqual([
      {
        part_number: 'ESP32-WROOM-32D',
        name: 'Wi-Fi and Bluetooth module, 3.3 V',
        quantity: 8,
        unit_price: 1250,
        line_total: 10000,
      },
    ]);
    expect(receiptLines('[]')).toBeNull();
    expect(receiptLines('{')).toBeNull();
    expect(receiptLines(JSON.stringify([{ part_number: 'X', name: 'Y', price: 1.5, quantity: 1, line_total: 2 }]))).toBeNull();
    expect(receiptWhatsAppText('LHR-abc')).toBe('Order LHR-abc. Here is my payment receipt.');
    expect(receiptWhatsAppText('LHR-abc')).not.toMatch(/phone|address/i);
  });

  it('advances Received, then payment, then dispatch', () => {
    expect(receiptTimeline('Pending').steps.map((step) => step.done)).toEqual([true, false, false]);
    expect(receiptTimeline('Pending').steps[1]?.current).toBe(true);
    expect(receiptTimeline('Paid').steps.map((step) => step.done)).toEqual([true, true, false]);
    expect(receiptTimeline('Dispatched').steps.every((step) => step.done)).toBe(true);
    expect(receiptTimeline('Delivered').steps.every((step) => step.done)).toBe(true);
    expect(receiptTimeline('Delivered').steps.some((step) => step.current)).toBe(false);
    expect(receiptTimeline('Cancelled')).toEqual({ cancelled: true, steps: [] });
    expect(receiptTimeline('Nope').steps.map((step) => step.done)).toEqual([true, false, false]);
    expect(stepStateLabel(true)).toBe('Done');
    expect(stepStateLabel(false)).toBe('Not yet');
  });

  it('prints the UTC timestamp as a Karachi date', () => {
    expect(formatOrderDate('2026-11-11 19:30:00')).toBe('12 Nov 2026');
    expect(formatOrderDate('2026-11-12 10:00:00')).toBe('12 Nov 2026');
    expect(formatOrderDate('not a date')).toBeNull();
    expect(formatOrderDate(null)).toBeNull();
  });
});
