import { describe, expect, it } from 'vitest';
import { constantTimeEqual } from '../../src/lib/admin/compare';
import { sessionSeconds } from '../../src/lib/admin/constants';
import { signSession, verifySession } from '../../src/lib/admin/session';

const secrets = { sessionSecret: 's'.repeat(40), adminKey: 'k'.repeat(40) };
const now = 1_800_000_000;

describe('constantTimeEqual', () => {
  it('compares equal-length bytes and refuses different lengths', () => {
    const a = new Uint8Array([1, 2, 3]);
    expect(constantTimeEqual(a, new Uint8Array([1, 2, 3]))).toBe(true);
    expect(constantTimeEqual(a, new Uint8Array([1, 2, 4]))).toBe(false);
    expect(constantTimeEqual(a, new Uint8Array([1, 2]))).toBe(false);
    expect(constantTimeEqual(new Uint8Array(), new Uint8Array())).toBe(true);
  });
});

describe('admin session', () => {
  it('verifies a fresh token', async () => {
    const token = await signSession(secrets, now);
    expect(await verifySession(token, secrets, now + 60)).toBe(true);
  });

  it('expires after twelve hours', async () => {
    const token = await signSession(secrets, now);
    expect(await verifySession(token, secrets, now + sessionSeconds - 1)).toBe(true);
    expect(await verifySession(token, secrets, now + sessionSeconds)).toBe(false);
  });

  it('rejects a tampered expiry or signature', async () => {
    const token = await signSession(secrets, now);
    const [version, expires, signature = ''] = token.split('.');
    expect(await verifySession(`${version}.${Number(expires) + 86_400}.${signature}`, secrets, now)).toBe(false);
    const flipped = signature.startsWith('a') ? `b${signature.slice(1)}` : `a${signature.slice(1)}`;
    expect(await verifySession(`${version}.${expires}.${flipped}`, secrets, now)).toBe(false);
  });

  it('rejects malformed tokens', async () => {
    for (const bad of [undefined, '', 'v1', 'v1.1.2.3', 'v2.1.abc', 'v1.-5.abc', 'v1.abc.def', 'x'.repeat(300)]) {
      expect(await verifySession(bad, secrets, now)).toBe(false);
    }
  });

  it('rejects a token after the session secret or admin key changes', async () => {
    const token = await signSession(secrets, now);
    expect(await verifySession(token, { ...secrets, sessionSecret: 't'.repeat(40) }, now)).toBe(false);
    expect(await verifySession(token, { ...secrets, adminKey: 'j'.repeat(40) }, now)).toBe(false);
  });
});
