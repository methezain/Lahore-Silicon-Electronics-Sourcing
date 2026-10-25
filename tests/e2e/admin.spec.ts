import { expect, test } from '@playwright/test';
import { adminKey, freshIp, sameOrigin, signIn } from './admin-helpers';

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== '1440', 'Admin tests change shared local data, so they run once.');
});

test.describe('anonymous visitor', () => {
  for (const path of ['/admin', '/admin/', '/admin/orders', '/admin/orders/export.csv', '/%61dmin', '/ADMIN/stock']) {
    test(`GET ${path} goes to the login page`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(302);
      expect(response.headers().location).toBe('/admin/login');
      expect(response.headers()['cache-control']).toBe('private, no-store');
      expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
    });
  }

  for (const path of ['/admin/orders', '/admin/logout', '/_actions/admin.setOrderStatus/', '/media/upload']) {
    test(`POST ${path} is hidden`, async ({ request }) => {
      const response = await request.post(path, { form: { x: '1' }, headers: sameOrigin });
      expect(response.status()).toBe(404);
    });
  }

  test('the login page is noindex and out of the sitemap rules', async ({ page, request }) => {
    const response = await page.goto('/admin/login');
    expect(response?.status()).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /admin');
  });
});

test.describe('owner', () => {
  test.skip(!adminKey, 'Needs ADMIN_KEY in .dev.vars with Turnstile test keys.');

  test('a wrong key is refused and the overview stays closed', async ({ page }) => {
    await signIn(page, 'not-the-key');
    await expect(page.getByText('That key is not right.')).toBeVisible();
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('the right key opens the overview, and sign out closes it', async ({ page, context }) => {
    await signIn(page);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Today at the counter' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');

    const cookie = (await context.cookies()).find((entry) => entry.name === '__Host-admin');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe('Strict');

    await page.goto('/admin/login');
    await expect(page).toHaveURL(/\/admin$/);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('a forged cookie is not a session', async ({ page, context }) => {
    await context.addCookies([{ name: '__Host-admin', value: 'v1.9999999999.deadbeef', domain: 'localhost', path: '/', secure: true }]);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('repeated attempts from one address are throttled', async ({ request }) => {
    const headers = { ...sameOrigin, 'cf-connecting-ip': freshIp() };
    const statuses: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      const response = await request.post('/admin/login', { form: { key: 'x', 'cf-turnstile-response': '' }, headers });
      statuses.push(response.status());
    }
    expect(statuses).toContain(429);
  });
});
