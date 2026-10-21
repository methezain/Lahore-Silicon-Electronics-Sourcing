import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { turnstileAction } from '../../src/lib/order-key';
import { turnstileHostnames, verifyTurnstile } from '../../src/lib/turnstile';

function siteverify(body: unknown, ok = true): (url: string, init: RequestInit) => Promise<Response> {
  return vi.fn(async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 }));
}

const allowed = turnstileHostnames('Example.com, lahoresilicon.com');

describe('turnstile hostnames', () => {
  it('splits, trims, and lowercases the allowlist', () => {
    expect([...turnstileHostnames(' lahoresilicon.com , ,Example.COM ')]).toEqual([
      'lahoresilicon.com',
      'example.com',
    ]);
    expect(turnstileHostnames(undefined).size).toBe(0);
  });

  it('keeps the committed allowlist on the production host only', () => {
    const config = readFileSync('wrangler.jsonc', 'utf8');
    expect(config).toContain('"TURNSTILE_HOSTNAMES": "lahoresilicon.com"');
    expect(config).not.toMatch(/example\.com|localhost|127\.0\.0\.1/);
    expect(config).not.toMatch(/1x00000000000000000000AA|1x0000000000000000000000000000000AA/);
    expect(config).toMatch(/"name": "ORDER_LIMIT"/);
    expect(config).toMatch(/"limit": 5/);
    expect(config).toMatch(/"period": 60/);
  });
});

describe('verifyTurnstile', () => {
  it('accepts a checkout token for an allowed hostname', async () => {
    const fetchImpl = siteverify({ success: true, action: turnstileAction, hostname: 'Example.com' });
    const verdict = await verifyTurnstile({
      token: 'real-token',
      secret: 'secret',
      remoteip: '203.0.113.8',
      hostnames: allowed,
      fetchImpl,
    });
    expect(verdict).toBe('ok');
    const [, init] = vi.mocked(fetchImpl).mock.calls[0] ?? [];
    const params = new URLSearchParams(String(init?.body));
    expect(params.get('secret')).toBe('secret');
    expect(params.get('response')).toBe('real-token');
    expect(params.get('remoteip')).toBe('203.0.113.8');
  });

  it('accepts Cloudflare’s published test response only for example.com', async () => {
    const testing = {
      success: true,
      hostname: 'example.com',
      metadata: { result_with_testing_key: true },
    };
    expect(await verifyTurnstile({
      token: 'XXXX.DUMMY.TOKEN.XXXX',
      secret: 'secret',
      remoteip: null,
      hostnames: turnstileHostnames('example.com'),
      fetchImpl: siteverify(testing),
    })).toBe('ok');
    expect(await verifyTurnstile({
      token: 'XXXX.DUMMY.TOKEN.XXXX',
      secret: 'secret',
      remoteip: null,
      hostnames: turnstileHostnames('lahoresilicon.com'),
      fetchImpl: siteverify(testing),
    })).toBe('rejected');
  });

  it('rejects a wrong action, a wrong host, a failed token, and a token that is the wrong shape', async () => {
    expect(await verifyTurnstile({
      token: 't',
      secret: 'secret',
      remoteip: null,
      hostnames: allowed,
      fetchImpl: siteverify({ success: true, action: 'signup', hostname: 'example.com' }),
    })).toBe('rejected');
    expect(await verifyTurnstile({
      token: 't',
      secret: 'secret',
      remoteip: null,
      hostnames: allowed,
      fetchImpl: siteverify({ success: true, action: turnstileAction, hostname: 'evil.example' }),
    })).toBe('rejected');
    expect(await verifyTurnstile({
      token: 't',
      secret: 'secret',
      remoteip: null,
      hostnames: allowed,
      fetchImpl: siteverify({ success: false, 'error-codes': ['invalid-input-response'] }),
    })).toBe('rejected');
    expect(await verifyTurnstile({
      token: '',
      secret: 'secret',
      remoteip: null,
      hostnames: allowed,
      fetchImpl: siteverify({ success: true }),
    })).toBe('rejected');
    expect(await verifyTurnstile({
      token: 'x'.repeat(2049),
      secret: 'secret',
      remoteip: null,
      hostnames: allowed,
      fetchImpl: siteverify({ success: true }),
    })).toBe('rejected');
  });

  it('fails closed when the secret or the network is missing', async () => {
    const fetchImpl = vi.fn();
    expect(await verifyTurnstile({
      token: 't',
      secret: undefined,
      remoteip: null,
      hostnames: allowed,
      fetchImpl,
    })).toBe('misconfigured');
    expect(await verifyTurnstile({
      token: 't',
      secret: 'secret',
      remoteip: null,
      hostnames: turnstileHostnames(''),
      fetchImpl,
    })).toBe('misconfigured');
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(await verifyTurnstile({
      token: 't',
      secret: 'secret',
      remoteip: null,
      hostnames: allowed,
      fetchImpl: async () => {
        throw new Error('offline');
      },
    })).toBe('unavailable');
    expect(await verifyTurnstile({
      token: 't',
      secret: 'secret',
      remoteip: null,
      hostnames: allowed,
      fetchImpl: siteverify({ success: true }, false),
    })).toBe('unavailable');
  });
});
