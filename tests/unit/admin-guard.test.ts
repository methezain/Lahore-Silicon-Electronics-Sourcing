import { describe, expect, it } from 'vitest';
import { adminResponseHeaders, gate, isAdminPath, normalizePath } from '../../src/lib/admin/guard';

describe('admin guard', () => {
  it('leaves the storefront alone', () => {
    for (const path of ['/', '/checkout', '/product/LM7805', '/administrator', '/api/vitals', '/order-success/LHR-1']) {
      expect(isAdminPath(path)).toBe(false);
      expect(gate(path, 'GET', false)).toBe('pass');
    }
  });

  it('sends an anonymous page request to the login page', () => {
    for (const path of ['/admin', '/admin/', '/admin/orders', '/admin/orders/LHR-1', '/admin/stock']) {
      expect(gate(path, 'GET', false)).toBe('login');
      expect(gate(path, 'HEAD', false)).toBe('login');
    }
  });

  it('hides anonymous writes and admin actions', () => {
    expect(gate('/admin/orders', 'POST', false)).toBe('hide');
    expect(gate('/admin/logout', 'POST', false)).toBe('hide');
    expect(gate('/_actions/admin.setStatus/', 'POST', false)).toBe('hide');
    expect(gate('/media/upload', 'POST', false)).toBe('hide');
  });

  it('keeps only the login page public', () => {
    expect(gate('/admin/login', 'GET', false)).toBe('pass');
    expect(gate('/admin/login', 'POST', false)).toBe('pass');
    expect(gate('/admin/login/', 'GET', false)).toBe('pass');
  });

  it('is not fooled by escapes, case or doubled slashes', () => {
    for (const path of ['/%61dmin', '/admin%2Forders', '/ADMIN/orders', '//admin/orders', '/admin//orders', '/%2561dmin', '/_actions/%61dmin.x']) {
      expect(isAdminPath(path)).toBe(true);
      expect(gate(path, 'POST', false)).toBe('hide');
    }
    expect(normalizePath('/admin/%zz')).toBe('/admin/malformed');
    expect(gate('/admin/%zz', 'GET', false)).toBe('login');
  });

  it('lets a signed-in request through', () => {
    expect(gate('/admin', 'GET', true)).toBe('pass');
    expect(gate('/admin/orders', 'POST', true)).toBe('pass');
    expect(gate('/_actions/admin.setStatus/', 'POST', true)).toBe('pass');
  });

  it('forbids caching and indexing', () => {
    expect(adminResponseHeaders['Cache-Control']).toBe('private, no-store');
    expect(adminResponseHeaders['X-Robots-Tag']).toBe('noindex, nofollow');
  });
});
