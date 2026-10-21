import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applySecurityHeaders,
  frameAncestorsPolicy,
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
});
