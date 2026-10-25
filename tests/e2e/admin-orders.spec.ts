import { expect, test } from '@playwright/test';
import { adminKey, localQty, localSql, signIn } from './admin-helpers';

test.describe.configure({ mode: 'serial' });
test.skip(!adminKey, 'Needs ADMIN_KEY in .dev.vars with Turnstile test keys.');
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== '1440', 'Admin tests change shared local data, so they run once.');
});

const stamp = Date.now().toString(16).slice(-8);
const walk = `LHR-E2E1${stamp}`;
const cancel = `LHR-E2E2${stamp}`;
const stale = `LHR-E2E3${stamp}`;

async function insert(id: string, qty: number) {
  const lines = JSON.stringify([{ part_number: 'NE555', name: 'Timer', price: 30, quantity: qty, line_total: 30 * qty }]);
  await localSql(
    `INSERT INTO Orders (id, customer_name, phone, destination, address, items_json, total_price, payment_ref, status, created_at, idempotency_key) VALUES ('${id}', 'E2E Buyer', '+923001234567', 'Lahore', 'House 1, Street 2, Town', '${lines}', ${30 * qty}, 'TXNE2E01', 'Pending', datetime('now'), 'e2e-${id}')`,
  );
}

test.beforeAll(async () => {
  await insert(walk, 1);
  await insert(cancel, 3);
  await insert(stale, 1);
});

test.afterAll(async () => {
  await localSql(`DELETE FROM order_events WHERE order_id IN ('${walk}', '${cancel}', '${stale}')`);
  await localSql(`DELETE FROM Orders WHERE id IN ('${walk}', '${cancel}', '${stale}')`);
});

test('find an order, walk it to Delivered, and the buyer receipt follows', async ({ page }) => {
  await signIn(page);
  await page.goto('/admin/orders');
  await page.getByPlaceholder('Order, name or phone').fill(walk);
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('link', { name: walk }).first()).toBeVisible();
  await page.getByRole('link', { name: walk }).first().click();

  const sheet = page.getByRole('dialog', { name: 'Order' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText('Awaiting payment').first()).toBeVisible();
  await expect(sheet.getByRole('link', { name: 'Message on WhatsApp' })).toHaveAttribute('href', /wa\.me\/923001234567\?text=/);

  const receipt = await page.context().newPage();
  await receipt.goto(`/order-success/${walk}`);
  await expect(receipt.locator('.step-name', { hasText: 'Payment confirmed' })).toBeVisible();
  const doneSteps = async () => receipt.locator('li[data-done="true"]').count();
  expect(await doneSteps()).toBe(1);

  await sheet.getByRole('button', { name: 'Mark as paid' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Marked as paid.' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Order' }).getByRole('button', { name: 'Mark as dispatched' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Marked as dispatched.' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Order' }).getByRole('button', { name: 'Mark as delivered' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Marked as delivered.' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Order' }).getByText('No further steps for this order.')).toBeVisible();

  await receipt.reload();
  expect(await doneSteps()).toBe(3);
});

test('cancelling with the box ticked puts the parts back on the shelf', async ({ page }) => {
  const before = await localQty('NE555');
  await localSql(`UPDATE stock SET qty = qty - 3 WHERE part_number = 'NE555'`);
  await signIn(page);
  await page.goto(`/admin/orders?order=${cancel}`);
  const sheet = page.getByRole('dialog', { name: 'Order' });
  await sheet.getByText('Cancel order…').click();
  await expect(sheet.getByLabel('Put the items back on the shelf')).toBeChecked();
  await sheet.getByRole('button', { name: 'Cancel this order' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'The parts are back on the shelf.' })).toBeVisible();
  expect(await localQty('NE555')).toBe(before);
});

test('a click from an out-of-date screen is refused and nothing changes', async ({ page }) => {
  await signIn(page);
  await page.goto(`/admin/orders?order=${stale}`);
  const sheet = page.getByRole('dialog', { name: 'Order' });
  await expect(sheet.getByRole('button', { name: 'Mark as paid' })).toBeVisible();
  await localSql(`UPDATE Orders SET status = 'Paid' WHERE id = '${stale}'`);
  await sheet.getByRole('button', { name: 'Mark as paid' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'This order changed on another screen' })).toBeVisible();
  const events = JSON.parse(await localSql(`SELECT COUNT(*) AS n FROM order_events WHERE order_id = '${stale}'`)) as { results: { n: number }[] }[];
  expect(events[0]?.results[0]?.n).toBe(0);
});
