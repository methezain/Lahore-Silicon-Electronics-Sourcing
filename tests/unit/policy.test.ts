import { describe, expect, it } from 'vitest';
import { partsListRule, partsMessage, sourcingMessage } from '../../src/lib/desk';
import { defaultShopName, pageTitle, paymentSentOnWhatsApp, shopName } from '../../src/lib/shop';
import { defectFact, defectNotice, deliveryCost, noCashOnDelivery, remoteDelivery, returnRule } from '../../src/lib/shipping';

describe('shop name', () => {
  it('uses the env value, and Lahore Silicon when that value is empty', () => {
    expect(shopName(undefined)).toBe(defaultShopName);
    expect(shopName('  ')).toBe('Lahore Silicon');
    expect(shopName('North Gate')).toBe('North Gate');
    expect(pageTitle('About', 'North Gate')).toBe('About | North Gate');
    expect(paymentSentOnWhatsApp).toBe('Payment details are sent on WhatsApp.');
  });
});

describe('shipping policy', () => {
  it('states the owner rules and does not invent a delivery price', () => {
    expect(returnRule).toBe('Report a defect within 24 hours of receiving the parcel.');
    expect(defectNotice).toBe('Message us on WhatsApp first.');
    expect(defectFact).toBe('Report within 24 hours');
    expect(noCashOnDelivery).toContain('no cash on delivery');
    expect(deliveryCost).toBe('Delivery cost is confirmed from your city, before you pay.');
    expect(remoteDelivery).toBe('Remote areas and Eid periods may add 1–2 days.');
    expect(`${deliveryCost} ${remoteDelivery} ${noCashOnDelivery}`).not.toMatch(/Rs\s*\d/);
  });
});

describe('sourcing form', () => {
  it('requires a part list and keeps the phone with it', () => {
    expect(partsMessage('  ')).toBe(partsListRule);
    expect(partsMessage('LM7805')).toBeNull();
    expect(sourcingMessage('0300 1234567', ' LM7805 × 2 ')).toBe('Phone: 0300 1234567\n\nLM7805 × 2');
  });
});
