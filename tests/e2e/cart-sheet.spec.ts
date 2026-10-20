import { expect, test } from '@playwright/test';

test('cart sheet traps tab, closes on escape, and returns focus', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'lahore_silicon_cart:LM7805',
      JSON.stringify({ part_number: 'LM7805', name: '5 V, 1 A, TO-220 linear regulator', quantity: 1 }),
    );
    localStorage.setItem(
      'lahore_silicon_cart:ESP32-WROOM-32D',
      JSON.stringify({ part_number: 'ESP32-WROOM-32D', name: 'Wi-Fi and Bluetooth module, 3.3 V', quantity: 2 }),
    );
  });
  await page.goto('/');
  await page.locator('#cart-button[data-ready="true"]').waitFor();
  const cart = page.getByRole('button', { name: /Cart, \d+ parts?/ });
  await cart.click();
  const dialog = page.getByRole('dialog', { name: 'Cart' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Added LM7805 to cart')).toHaveCount(0);
  const close = dialog.getByRole('button', { name: 'Close cart' });
  await expect(close).toBeFocused();

  const focusable = dialog.locator('a[href], button:not([disabled]), input:not([disabled])');
  const count = await focusable.count();
  expect(count).toBeGreaterThan(3);

  for (let step = 0; step < count; step += 1) {
    await page.keyboard.press('Tab');
    const inside = await dialog.evaluate((node) => node.contains(document.activeElement));
    expect(inside).toBe(true);
  }
  await expect(close).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('link', { name: /Check out/ })).toBeFocused();

  const lmQty = dialog.getByRole('textbox', { name: 'Quantity for LM7805' });
  await lmQty.fill('999');
  await lmQty.blur();
  await expect(lmQty).toHaveValue('48');
  await expect(dialog.getByText('Only 48 in stock')).toBeVisible();
  await dialog.getByRole('button', { name: 'Increase ESP32-WROOM-32D' }).click();
  await expect(dialog.getByRole('textbox', { name: 'Quantity for ESP32-WROOM-32D' })).toHaveValue('3');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(cart).toBeFocused();

  await cart.click();
  await expect(dialog).toBeVisible();
  await page.locator('.cart-sheet').click({ position: { x: 4, y: 80 } });
  await expect(dialog).toBeHidden();
  await expect(cart).toBeFocused();
});

test('cart sheet flags a part the shop no longer sells', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'lahore_silicon_cart:LM317',
      JSON.stringify({ part_number: 'LM317', name: 'Old name', quantity: 1 }),
    );
  });
  await page.goto('/');
  await page.locator('#cart-button[data-ready="true"]').waitFor();
  await page.getByRole('button', { name: /Cart, \d+ parts?/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Cart' });
  await expect(dialog.getByText('The shop no longer sells LM317.')).toBeVisible();
  await expect(dialog.getByRole('link', { name: /Check out/ })).toHaveCount(0);
  await expect(dialog.getByText('Rs 0')).toBeVisible();
});

test('dev gallery renders the new components', async ({ page }) => {
  await page.goto('/dev/components');
  await expect(page.getByRole('heading', { name: 'Catalog table' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Key figures' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Three steps, and you pay the total shown.' })).toBeVisible();
  await expect(page.getByText('ESP32-WROOM-32D').first()).toBeVisible();
  await expect(page.getByText('Rs 12,345').first()).toBeVisible();

  const width = page.viewportSize()?.width ?? 0;
  const table = page.locator('.cat-table');
  const cards = page.locator('.cat-cards');
  if (width >= 900) {
    await expect(table).toBeVisible();
    await expect(cards).toBeHidden();
  } else {
    await expect(table).toBeHidden();
    await expect(cards).toBeVisible();
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.locator('button[data-ready="true"]:text("Open the cart sheet")').waitFor();
  await page.getByRole('button', { name: 'Open the cart sheet' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cart' });
  await expect(dialog.getByText('Added LM7805 to cart')).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Check out · Rs 2,545' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /Cart, \d+ parts?/ })).toBeFocused();

  await page.getByRole('button', { name: 'Show the empty cart' }).click();
  await expect(dialog.getByText('Your cart is empty. Browse the catalog.')).toBeVisible();
});
