import { expect, test, type Page } from '@playwright/test';
import { adminKey, localQty, localSql, signIn } from './admin-helpers';

test.describe.configure({ mode: 'serial' });
test.skip(!adminKey, 'Needs ADMIN_KEY in .dev.vars with Turnstile test keys.');
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== '1440', 'Admin tests change shared local data, so they run once.');
});

const PART = 'NE555';
let original = 0;
let originalPrice = 0;

test.beforeAll(async () => {
  original = await localQty(PART);
  const priced = JSON.parse(await localSql(`SELECT price FROM products WHERE part_number = '${PART}'`)) as { results: { price: number }[] }[];
  originalPrice = priced[0]?.results[0]?.price ?? 0;
});

test.afterAll(async () => {
  await localSql(`UPDATE stock SET qty = ${original}, restock_on = NULL WHERE part_number = '${PART}'`);
  await localSql(`UPDATE products SET price = ${originalPrice}, data = json_set(data, '$.price', ${originalPrice}) WHERE part_number = '${PART}'`);
  await localSql(`DELETE FROM Orders WHERE idempotency_key LIKE 'e2e-stock-%'`);
});

async function row(page: Page) {
  return page.locator('[data-stock-row]').filter({ hasText: PART });
}

test('an admin stock edit changes the number buyers see', async ({ page }) => {
  await signIn(page);
  await page.goto('/admin/stock');
  const stockRow = await row(page);
  await expect(stockRow.getByRole('button', { name: 'Save' })).toBeHidden();
  await stockRow.getByLabel(`Shelf count, ${PART}`).fill('7');
  await stockRow.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status').filter({ hasText: `Saved ${PART}.` })).toBeVisible();

  await page.goto(`/product/${PART.toLowerCase()}`);
  await expect(page.getByText('7 in stock').first()).toBeVisible();
  await page.goto('/');
  await expect(page.getByText('7 in stock').first()).toBeVisible();
});

test('zero with a restock date shows the date on the shop', async ({ page }) => {
  await signIn(page);
  await page.goto('/admin/stock');
  const stockRow = await row(page);
  await stockRow.getByLabel(`Shelf count, ${PART}`).fill('0');
  await stockRow.getByLabel(`Restock date, ${PART}`).fill('2026-11-12');
  await stockRow.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status').filter({ hasText: `Saved ${PART}.` })).toBeVisible();
  await page.goto(`/product/${PART.toLowerCase()}`);
  await expect(page.getByText('Out of stock, back around 12 Nov 2026').first()).toBeVisible();
});

test('a save from an out-of-date screen is refused', async ({ page }) => {
  await localSql(`UPDATE stock SET qty = 20, restock_on = NULL WHERE part_number = '${PART}'`);
  await signIn(page);
  await page.goto('/admin/stock');
  const stockRow = await row(page);
  await localSql(`UPDATE stock SET qty = 11 WHERE part_number = '${PART}'`);
  await stockRow.getByLabel(`Shelf count, ${PART}`).fill('99');
  await stockRow.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('alert').filter({ hasText: `${PART} changed while you were editing` })).toBeVisible();
  expect(await localQty(PART)).toBe(11);
});

test('a placed order lowers the number buyers see, and a price edit reaches checkout', async ({ page }) => {
  test.setTimeout(240_000);
  await localSql(`UPDATE stock SET qty = 20, restock_on = NULL WHERE part_number = '${PART}'`);
  await localSql(`UPDATE products SET price = 123, data = json_set(data, '$.price', 123) WHERE part_number = '${PART}'`);
  expect(await localQty(PART)).toBe(20);

  await expect
    .poll(async () => {
      await page.goto(`/product/${PART.toLowerCase()}`);
      return (await page.locator('.qty-row .buy-add').textContent())?.trim();
    }, { timeout: 45_000, intervals: [3_000] })
    .toBe('Add to cart · Rs 123');
  await expect(page.getByText('20 in stock').first()).toBeVisible();

  await page.locator('.qty-row .buy-add').click();
  const cart = page.getByRole('dialog', { name: 'Cart' });
  await expect(cart).toBeVisible();
  await cart.getByRole('link', { name: /Check out/ }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  const place = page.getByRole('button', { name: 'Place order · Rs 123' });
  await expect(place).toBeEnabled();
  await expect(page.locator('#summary-total')).toHaveText('Rs 123');
  await page.getByLabel('Name').fill('Stock Tester');
  await page.getByLabel('Phone').fill('03001234567');
  await page.getByLabel('City or area').fill('Lahore');
  await page.getByLabel('Address', { exact: true }).fill('House 12, Mall Road');
  await page.getByLabel('Payment reference').fill('TXN12345');
  await expect(page.locator('#checkout-turnstile')).toHaveAttribute('data-state', 'passed', { timeout: 30_000 });
  await expect(page.getByText('Enter your name (at least 2 letters).')).toHaveCount(0);
  await place.click();
  await expect(page).toHaveURL(/\/order-success\/LHR-[0-9a-f]{16}$/, { timeout: 30_000 });

  const total = JSON.parse(await localSql(`SELECT total_price FROM Orders ORDER BY created_at DESC, rowid DESC LIMIT 1`)) as { results: { total_price: number }[] }[];
  expect(total[0]?.results[0]?.total_price).toBe(123);
  expect(await localQty(PART)).toBe(19);

  await page.goto(`/product/${PART.toLowerCase()}`);
  await expect(page.getByText('19 in stock').first()).toBeVisible();
});
