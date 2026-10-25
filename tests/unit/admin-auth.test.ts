import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { adminKeyMatches, attemptLogin, limitKey, type LoginDeps } from '../../src/lib/admin/auth';
import { adminTurnstileAction } from '../../src/lib/admin/constants';
import { verifySession } from '../../src/lib/admin/session';

const key = 'K'.repeat(40);
const secret = 'S'.repeat(40);
const now = 1_800_000_000;
const siteverify = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
const passing = () => siteverify({ success: true, action: adminTurnstileAction, hostname: 'shop.example' });

function deps(over: Partial<LoginDeps> = {}): LoginDeps {
  return {
    adminKey: key,
    sessionSecret: secret,
    turnstileSecret: 'turnstile',
    hostnames: 'shop.example',
    limiter: { limit: vi.fn(async () => ({ success: true })) },
    nowSeconds: now,
    fetchImpl: passing(),
    ...over,
  };
}

const input = { key, turnstileToken: 'token', remoteip: '203.0.113.9' };

describe('adminKeyMatches', () => {
  it('accepts only the exact key', async () => {
    expect(await adminKeyMatches(key, key)).toBe(true);
    expect(await adminKeyMatches(`${key}x`, key)).toBe(false);
    expect(await adminKeyMatches('', key)).toBe(false);
    expect(await adminKeyMatches('x'.repeat(600), key)).toBe(false);
  });
});

describe('attemptLogin', () => {
  it('returns a verifiable session for the right key', async () => {
    const outcome = await attemptLogin(input, deps());
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(await verifySession(outcome.token, { sessionSecret: secret, adminKey: key }, now + 1)).toBe(true);
  });

  it('refuses a wrong key', async () => {
    expect(await attemptLogin({ ...input, key: 'nope' }, deps())).toEqual({ ok: false, reason: 'wrong-key' });
  });

  it('refuses when the rate limit says no, without calling Turnstile', async () => {
    const fetchImpl = passing();
    const limiter = { limit: vi.fn(async () => ({ success: false })) };
    expect(await attemptLogin(input, deps({ limiter, fetchImpl }))).toEqual({ ok: false, reason: 'throttled' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('keys the limit on the client address, with a shared bucket when it is missing', async () => {
    const limiter = { limit: vi.fn(async () => ({ success: true })) };
    await attemptLogin(input, deps({ limiter }));
    await attemptLogin({ ...input, remoteip: null }, deps({ limiter }));
    expect(limiter.limit).toHaveBeenNthCalledWith(1, { key: 'admin-login:203.0.113.9' });
    expect(limiter.limit).toHaveBeenNthCalledWith(2, { key: 'admin-login:unknown' });
    expect(limitKey('a b')).toBe('admin-login:unknown');
  });

  it('fails closed when the limiter throws or is missing', async () => {
    const broken = { limit: vi.fn(async () => { throw new Error('down'); }) };
    expect(await attemptLogin(input, deps({ limiter: broken }))).toEqual({ ok: false, reason: 'unavailable' });
    expect(await attemptLogin(input, deps({ limiter: undefined }))).toEqual({ ok: false, reason: 'misconfigured' });
  });

  it('refuses a missing or short secret', async () => {
    expect(await attemptLogin(input, deps({ adminKey: undefined }))).toEqual({ ok: false, reason: 'misconfigured' });
    expect(await attemptLogin({ ...input, key: 'short' }, deps({ adminKey: 'short' }))).toEqual({ ok: false, reason: 'misconfigured' });
    expect(await attemptLogin(input, deps({ sessionSecret: 'x'.repeat(10) }))).toEqual({ ok: false, reason: 'misconfigured' });
  });

  it('refuses a failed or wrong-action Turnstile token, even with the right key', async () => {
    expect(await attemptLogin(input, deps({ fetchImpl: siteverify({ success: false }) }))).toEqual({ ok: false, reason: 'captcha' });
    const checkout = siteverify({ success: true, action: 'checkout', hostname: 'shop.example' });
    expect(await attemptLogin(input, deps({ fetchImpl: checkout }))).toEqual({ ok: false, reason: 'captcha' });
    expect(await attemptLogin({ ...input, turnstileToken: '' }, deps())).toEqual({ ok: false, reason: 'captcha' });
  });

  it('reports an unreachable Turnstile as unavailable', async () => {
    const down = vi.fn(async () => new Response('', { status: 500 }));
    expect(await attemptLogin(input, deps({ fetchImpl: down }))).toEqual({ ok: false, reason: 'unavailable' });
  });
});

describe('wrangler config', () => {
  it('declares the admin login limit and the migrations folder', () => {
    const config = readFileSync('wrangler.jsonc', 'utf8');
    expect(config).toMatch(/"name": "ADMIN_LOGIN_LIMIT"/);
    expect(config).toMatch(/"migrations_dir": "db\/migrations"/);
  });
});
