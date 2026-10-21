import { expect, test } from '@playwright/test';

test('search dialog finds a part, misses cleanly, and traps focus', async ({ page }, testInfo) => {
  const shot = (name: string) => `test-results/search-dialog/${testInfo.project.name}-${name}.png`;

  await page.goto('/');
  await page.locator('#search-open[data-ready="true"]').waitFor();
  await page.screenshot({ path: shot('header') });

  await page.keyboard.press('/');
  const dialog = page.getByRole('dialog', { name: 'Search parts' });
  await expect(dialog).toBeVisible();
  const search = dialog.getByRole('combobox', { name: 'Search parts' });
  await expect(search).toBeFocused();
  await expect(search).toHaveAttribute('placeholder', 'LM7805, ESP32, "5 V regulator"');

  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Close search' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(search).toBeFocused();

  await search.fill('lm 7805');
  const exact = dialog.getByRole('option', { name: /LM7805/ });
  await expect(exact).toBeVisible();
  await expect(exact).toHaveAttribute('aria-selected', 'true');
  await expect(exact).toContainText('48 in stock');
  await expect(exact).toContainText('Rs 45');
  const thumb = exact.locator('img');
  await expect(thumb).toHaveAttribute('width', '56');
  await expect(thumb).toHaveAttribute('height', '56');
  await expect(thumb).toHaveAttribute('src', /webp/i);
  await expect.poll(
    async () => thumb.evaluate((node: HTMLImageElement) => node.naturalWidth),
    { timeout: 15_000 },
  ).toBeGreaterThan(0);
  await exact.screenshot({ path: shot('hit') });
  await page.screenshot({ path: shot('exact') });

  await search.fill('ESP32');
  await expect(dialog.getByRole('option', { name: /ESP32-WROOM-32D/ })).toBeVisible();
  await page.screenshot({ path: shot('long-part') });

  await search.fill('5v');
  const options = dialog.getByRole('option');
  await expect(options.filter({ hasText: 'LM7805' })).toHaveCount(1);
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(options.first()).toHaveAttribute('aria-selected', 'false');
  const href = await options.nth(1).getAttribute('href');
  expect(href).toMatch(/^\/product\//);

  await search.fill('ams1117 3.3');
  await expect(dialog.getByRole('option').first()).toContainText('AMS1117-3.3');

  await search.fill('TIP120');
  await expect(dialog.getByText('We don\'t stock "TIP120".')).toBeVisible();
  const shopWhatsApp = page.getByRole('contentinfo').getByRole('link', { name: /WhatsApp/ });
  const sourcing = dialog.getByRole('link', { name: 'Send the part number on WhatsApp and we\'ll check Hall Road.' });
  if (await shopWhatsApp.count()) {
    await expect(sourcing).toBeVisible();
  } else {
    await expect(dialog.getByRole('link', { name: /WhatsApp/ })).toHaveCount(0);
  }
  await expect(dialog.getByRole('link', { name: 'Power 3' })).toHaveAttribute('href', '/?category=Power#catalog');
  await expect(dialog.getByRole('link', { name: 'Boards 2' })).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'ICs 1' })).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Sensors 3' })).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Relays 1' })).toBeVisible();
  await page.screenshot({ path: shot('miss') });

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  const focusable = dialog.locator('a[href], button:not([disabled]), input:not([disabled])');
  const count = await focusable.count();
  expect(count).toBeGreaterThan(3);
  await search.focus();
  for (let step = 0; step < count; step += 1) {
    await page.keyboard.press('Tab');
    const inside = await dialog.evaluate((node) => node.contains(document.activeElement));
    expect(inside).toBe(true);
  }
  await expect(search).toBeFocused();

  await page.locator('.search-dialog').click({ position: { x: 2, y: 2 } });
  await expect(dialog).toBeHidden();
  await expect(page.locator('#search-open')).toBeFocused();

  await page.keyboard.press('/');
  await search.fill('lm 7805');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/product\/lm7805$/);
  await expect(page.getByText('LM7805', { exact: true }).first()).toBeVisible();
});

test('slash does not open search from a field or while the cart is open', async ({ page }) => {
  await page.goto('/');
  await page.locator('#search-open[data-ready="true"]').waitFor();
  await page.getByRole('button', { name: /Cart \d+ parts?/ }).click();
  await expect(page.getByRole('dialog', { name: 'Cart' })).toBeVisible();
  await page.keyboard.press('/');
  await expect(page.getByRole('dialog', { name: 'Search parts' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Cart' })).toBeHidden();

  await page.keyboard.press('/');
  const search = page.getByRole('combobox', { name: 'Search parts' });
  await expect(search).toBeFocused();
  await page.keyboard.press('/');
  await expect(search).toHaveValue('/');
});

test('a dock control opens search and returns focus', async ({ page }) => {
  await page.goto('/');
  await page.locator('#search-open[data-ready="true"]').waitFor();
  await page.evaluate(() => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.searchOpen = '';
    button.textContent = 'Dock search';
    button.style.position = 'fixed';
    button.style.top = '120px';
    button.style.left = '16px';
    button.style.zIndex = '5';
    document.body.appendChild(button);
  });
  const dock = page.getByRole('button', { name: 'Dock search' });
  await dock.click();
  await expect(page.getByRole('dialog', { name: 'Search parts' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Search parts' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Search parts' })).toBeHidden();
  await expect(dock).toBeFocused();
});

test('search dialog stays put with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#search-open[data-ready="true"]').waitFor();
  await page.keyboard.press('/');
  const panel = page.locator('.search-panel');
  await expect(panel).toBeVisible();
  await expect.poll(async () => panel.evaluate((node) => getComputedStyle(node).animationName)).not.toBe('search-palette-in');
  const transform = await panel.evaluate((node) => getComputedStyle(node).transform);
  expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(transform);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Search parts' })).toBeHidden();
});
