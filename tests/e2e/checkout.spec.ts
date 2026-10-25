import { exec as execCommand } from 'node:child_process';
import { closeSync, mkdirSync, openSync, statSync, unlinkSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './axe';

const exec = promisify(execCommand);
const orderLock = 'test-results/checkout-order.lock';

async function withOrderLock(task: () => Promise<void>) {
  mkdirSync('test-results', { recursive: true });
  try {
    if (Date.now() - statSync(orderLock).mtimeMs > 90_000) unlinkSync(orderLock);
  } catch {
    // No leftover lock.
  }
  for (;;) {
    try {
      const fd = openSync(orderLock, 'wx');
      try {
        await task();
      } finally {
        closeSync(fd);
        unlinkSync(orderLock);
      }
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      await delay(100);
    }
  }
}

async function resetEsp32Stock() {
  const sql = "UPDATE stock SET qty = 9 WHERE part_number = 'ESP32-WROOM-32D'";
  await exec(`npx wrangler d1 execute electronics-sourcing-db --local --command "${sql}"`, {
    timeout: 60_000,
  });
}

const nameRule = 'Enter your name (at least 2 letters).';
const phoneRule = 'Enter a Pakistani mobile number, like 0300 1234567.';
const cityRule = 'Enter your city or area.';
const addressRule = 'Enter the full address, with house and street.';
const paymentRule = 'Paste the transaction ID from your payment (at least 5 characters).';

test('add to cart, clear field errors, and save the order', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  await withOrderLock(async () => {
  await resetEsp32Stock();
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/product/esp32-wroom-32d');
  const qty = page.locator('.qty-row').getByRole('textbox', { name: 'Quantity for ESP32-WROOM-32D' });
  await expect(qty).toBeVisible();
  await qty.fill('8');
  await qty.blur();
  const add = page.locator('.qty-row .buy-add');
  await expect(add).toHaveText('Add to cart · Rs 10,000');
  await add.click();

  const cart = page.getByRole('dialog', { name: 'Cart' });
  await expect(cart).toBeVisible();
  await expect(cart.getByText('Added ESP32-WROOM-32D to cart')).toBeVisible();
  await cart.getByRole('link', { name: /Check out/ }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  const place = page.getByRole('button', { name: 'Place order · Rs 10,000' });
  await expect(place).toBeEnabled();
  await expect(page.locator('#summary-merchandise')).toHaveText('Rs 10,000');
  await expect(page.locator('#summary-total')).toHaveText('Rs 10,000');
  await expect(page.getByText('Delivery cost is confirmed from your city, before you pay.').first()).toBeVisible();

  const width = page.viewportSize()?.width ?? 0;
  if (width >= 900) {
    await expect(page.locator('.summary')).toHaveCSS('position', 'sticky');
    await expect(page.locator('#summary-toggle')).toBeHidden();
  } else {
    await expect(page.locator('#summary-toggle-label')).toHaveText('Show order · Rs 10,000');
    await page.locator('#summary-toggle').click();
  }
  await expect(page.locator('#order-panel')).toContainText('ESP32-WROOM-32D');
  await expect(page.locator('#order-panel')).toContainText('Wi-Fi and Bluetooth module, 3.3 V');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await page.getByLabel('Name').focus();
  const headerBottom = await page.locator('.site-header').evaluate((el) => el.getBoundingClientRect().bottom);
  const nameBox = await page.getByLabel('Name').boundingBox();
  expect(nameBox?.y ?? 0).toBeGreaterThanOrEqual(headerBottom - 1);
  const nameShadow = await page.getByLabel('Name').evaluate((el) => getComputedStyle(el).boxShadow);
  expect(nameShadow).not.toBe('none');

  await place.click();
  await expect(page.getByText(nameRule)).toBeVisible();
  await expect(page.getByText(phoneRule)).toBeVisible();
  await expect(page.getByText(cityRule)).toBeVisible();
  await expect(page.getByText(addressRule)).toBeVisible();
  await expect(page.getByText(paymentRule)).toBeVisible();
  await expect(page.getByLabel('Name')).toBeFocused();

  await page.getByLabel('Name').fill('Ali');
  await page.getByLabel('Phone').fill('03001234567');
  await page.getByLabel('City or area').fill('Lahore');
  await page.getByLabel('Address', { exact: true }).fill('House 12, Mall Road');
  await page.getByLabel('Payment reference').fill('TXN12345');
  await expect(page.getByText(nameRule)).toHaveCount(0);
  await expect(page.getByText(phoneRule)).toHaveCount(0);
  await expect(page.getByText(cityRule)).toHaveCount(0);
  await expect(page.getByText(addressRule)).toHaveCount(0);
  await expect(page.getByText(paymentRule)).toHaveCount(0);
  await expect(page.locator('#checkout-turnstile')).toHaveAttribute('data-state', 'passed', { timeout: 20_000 });

  await page.screenshot({
    path: `test-results/checkout-review/${testInfo.project.name}-filled.png`,
    fullPage: true,
  });

  const copy = page.locator('.copy-btn');
  if (await copy.count()) {
    await copy.first().click();
    await expect(copy.first()).toHaveText('Copied');
  }

  await place.click();
  await expect(page).toHaveURL(/\/order-success\/LHR-[0-9a-f]{16}$/, { timeout: 20_000 });
  const id = new URL(page.url()).pathname.split('/').pop() ?? '';
  await expect(page.getByRole('heading', { name: 'Order received' })).toBeVisible();
  await expect(page.getByText("We'll confirm your payment and dispatch.")).toBeVisible();
  await expect(page.getByText(id, { exact: true })).toBeVisible();
  await expect(page.locator('.total')).toContainText('Total');
  await expect(page.locator('.total')).toContainText('Rs 10,000');
  await expect(page.locator('.line .part')).toHaveText('ESP32-WROOM-32D');
  await expect(page.locator('.line .job')).toHaveText('Wi-Fi and Bluetooth module, 3.3 V');
  await expect(page.locator('.meta')).toContainText(/\d{1,2} [A-Za-z]+ \d{4}/);
  const delivery = page.locator('.meta div').filter({ hasText: 'Delivery' });
  await expect(delivery).toContainText('Lahore');
  await expect(page.locator('.step-name', { hasText: 'Received' })).toBeVisible();
  await expect(page.locator('.step-name', { hasText: 'Payment confirmed' })).toBeVisible();
  await expect(page.locator('.step-name', { hasText: 'Dispatched' })).toBeVisible();
  await expect(page.locator('.promise')).toContainText('dispatched the same day');
  const body = await page.locator('body').innerText();
  expect(body).not.toContain('Mall Road');
  expect(body).not.toContain('03001234567');
  expect(body).not.toContain('TXN12345');
  expect(body).not.toMatch(/\bAli\b/);
  const receiptLink = page.getByRole('link', { name: 'Send payment receipt on WhatsApp' });
  if (await receiptLink.count()) {
    await expect(receiptLink).toHaveAttribute('href', /wa\.me\/\d+\?text=/);
    await expect(receiptLink).toHaveAttribute('target', '_blank');
  }
  const savedOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(savedOverflow).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page);
  await page.screenshot({
    path: `test-results/order-review/${testInfo.project.name}-success.png`,
    fullPage: true,
  });
  await resetEsp32Stock();
  });
});

test('an empty cart shows an empty state instead of the form', async ({ page }, testInfo) => {
  await page.goto('/checkout');
  const empty = page.locator('#checkout-empty');
  await expect(empty).toBeVisible();
  await expect(empty).toHaveText('Your cart is empty. Browse the catalog.');
  await expect(empty.getByRole('link', { name: 'Browse the catalog.' })).toHaveAttribute('href', '/');
  await expect(page.locator('#checkout-form')).toBeHidden();
  await expect(page.locator('#checkout-intro')).toBeHidden();
  await expect(page.getByRole('button', { name: /Place order/ })).toBeHidden();
  await expect(page.getByText(/Show order/)).toBeHidden();
  await page.screenshot({
    path: `test-results/checkout-review/${testInfo.project.name}-empty.png`,
    fullPage: true,
  });
  await empty.getByRole('link', { name: 'Browse the catalog.' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible();
});

test('axe finds no WCAG A/AA violations on checkout', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'lahore_silicon_cart:ESP32-WROOM-32D',
      JSON.stringify({
        part_number: 'ESP32-WROOM-32D',
        name: 'Wi-Fi and Bluetooth module, 3.3 V',
        quantity: 1,
      }),
    );
  });
  await page.goto('/checkout');
  await page.getByRole('button', { name: /Place order/ }).waitFor();
  await expectNoAxeViolations(page);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the place order button does not animate a transform', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
    const transition = await page.locator('#submit-btn').evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(transition).not.toContain('transform');
  });
});
