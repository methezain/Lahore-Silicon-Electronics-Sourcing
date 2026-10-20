import { expect, test } from '@playwright/test';

test('product photo is sized, eager, and does not shift', async ({ page }) => {
  await page.addInitScript(() => {
    let cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!shift.hadRecentInput) cls += shift.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
    Object.defineProperty(window, '__cls', { get: () => cls });
  });

  await page.goto('/product/lm7805');
  const img = page.locator('.image-well img');
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute('width', '640');
  await expect(img).toHaveAttribute('height', '640');
  await expect(img).toHaveAttribute('fetchpriority', 'high');
  await expect(img).toHaveAttribute('loading', 'eager');
  await expect(img).toHaveAttribute('sizes', /516px/);
  const types = await page.locator('.image-well source').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('type')),
  );
  expect(types).toContain('image/avif');
  expect(types).toContain('image/webp');
  await expect(page.getByText('Representative studio photograph, not a photo of the lot in the drawer.')).toBeVisible();
  await img.evaluate((node: HTMLImageElement) => (node.decode ? node.decode() : undefined));
  await expect.poll(async () => img.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);

  const before = await img.boundingBox();
  await page.evaluate(() => document.fonts.ready);
  const after = await img.boundingBox();
  expect(after?.width).toBe(before?.width);
  expect(after?.height).toBe(before?.height);
  expect(after?.width).toBeGreaterThan(200);

  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  expect(cls).toBeLessThanOrEqual(0.05);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('catalog thumbnail and product photo share a view-transition name', async ({ page }) => {
  await page.goto('/');
  const thumb = page.locator('a[href="/product/lm7805"]:visible img');
  await expect(thumb).toHaveAttribute('alt', '');
  await expect(thumb).toHaveAttribute('width', '56');
  await expect(thumb).toHaveAttribute('height', '56');
  await expect(thumb).toHaveAttribute('sizes', '56px');
  await expect(thumb).toHaveAttribute('loading', 'lazy');
  await expect(thumb).toHaveAttribute('decoding', 'async');
  const catalogName = await thumb.evaluate((el) => getComputedStyle(el).viewTransitionName);
  expect(catalogName).toBe('part-lm7805');

  await page.goto('/product/lm7805');
  const productName = await page.locator('.image-well img').evaluate((el) => getComputedStyle(el).viewTransitionName);
  expect(productName).toBe(catalogName);
});

test('cart line uses the optimized thumb', async ({ page }) => {
  await page.goto('/product/esp32-wroom-32d');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  const cartImg = page.locator('.cart-photo img');
  await expect(cartImg).toBeVisible();
  await expect(cartImg).toHaveAttribute('width', '64');
  await expect(cartImg).toHaveAttribute('height', '64');
  await expect(cartImg).toHaveAttribute('loading', 'lazy');
  await expect(cartImg).toHaveAttribute('decoding', 'async');
  const src = await cartImg.getAttribute('src');
  expect(src).toBeTruthy();
  expect(src).not.toMatch(/^\/parts\//);
  expect(src).toMatch(/webp/i);
  await expect.poll(async () => cartImg.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
});

test('product photo stays visible with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/product/lm7805');
  await expect(page.locator('.image-well img')).toBeVisible();
  const animation = await page.locator('.product-screen').evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe('none');
});
