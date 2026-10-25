import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applySecurityHeaders,
  frameAncestorsPolicy,
  secureResponse,
  securityHeaderEntries,
} from '../../src/lib/security-headers';

describe('security headers', () => {
  it('sets the fixed headers and adds frame-ancestors to an existing CSP', () => {
    const headers = new Headers({ 'Content-Security-Policy': "script-src 'self' 'sha256-abc'" });
    applySecurityHeaders(headers);
    for (const [name, value] of securityHeaderEntries) {
      expect(headers.get(name)).toBe(value);
    }
    const policy = headers.get('Content-Security-Policy') ?? '';
    expect(policy).toContain("script-src 'self' 'sha256-abc'");
    expect(policy).toContain(frameAncestorsPolicy);
    expect(policy.split('frame-ancestors').length).toBe(2);
  });

  it('ships the same values on static files', () => {
    const file = readFileSync('public/_headers', 'utf8');
    for (const [name, value] of securityHeaderEntries) {
      expect(file).toContain(`${name}: ${value}`);
    }
    expect(file).toContain(`Content-Security-Policy: ${frameAncestorsPolicy}`);
  });

  it('copies immutable response headers instead of failing the image', async () => {
    const response = new Response('image', { status: 200, headers: { 'content-type': 'image/avif' } });
    response.headers.set = () => {
      throw new TypeError("Can't modify immutable headers.");
    };
    const secured = secureResponse(response);
    expect(secured).not.toBe(response);
    expect(secured.headers.get('content-type')).toBe('image/avif');
    expect(secured.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(secured.headers.get('Content-Security-Policy')).toBe(frameAncestorsPolicy);
    expect(await secured.text()).toBe('image');
  });
});
