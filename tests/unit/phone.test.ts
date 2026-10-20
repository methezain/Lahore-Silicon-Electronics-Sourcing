import { describe, expect, it } from 'vitest';
import { normalizePkMobile, phoneRule } from '../../src/lib/phone';

describe('normalizePkMobile', () => {
  it('keeps the rule text with the module', () => {
    expect(phoneRule).toBe('Enter a Pakistani mobile number, 03XX XXXXXXX.');
  });

  it.each([
    '03001234567',
    '3001234567',
    '+923001234567',
    '923001234567',
    '0300 123 4567',
    '0300-123-4567',
    '(0300) 1234567',
    '+92 300 1234567',
    '9203001234567',
  ])('accepts %s', (raw) => {
    expect(normalizePkMobile(raw)).toBe('+923001234567');
  });

  it.each(['', '   ', 'abc', '0300123456', '030012345678', '04001234567', '00923001234567', '+1 3001234567'])(
    'rejects %s',
    (raw) => {
      expect(normalizePkMobile(raw)).toBeUndefined();
    },
  );
});
