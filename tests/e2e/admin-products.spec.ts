import { deflateSync } from 'node:zlib';
import { expect, test } from '@playwright/test';
import { adminKey, localSql, signIn } from './admin-helpers';

test.describe.configure({ mode: 'serial' });
test.skip(!adminKey, 'Needs ADMIN_KEY in .dev.vars with Turnstile test keys.');
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== '1440', 'Admin tests change shared local data, so they run once.');
});

const part = `E2E-${Date.now().toString(36).toUpperCase()}`;
const slug = part.toLowerCase();

function crc32(buffer: Buffer): number {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function png(size: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, 235)]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

test.afterAll(async () => {
  await localSql(`DELETE FROM media_files WHERE key IN (SELECT key FROM media WHERE part_number = '${part}')`);
  await localSql(`DELETE FROM media WHERE part_number = '${part}'`);
  await localSql(`DELETE FROM stock WHERE part_number = '${part}'`);
  await localSql(`DELETE FROM products WHERE part_number = '${part}'`);
});

test('add a product with a photo, buy-ready on the shop, then hide it', async ({ page, request }) => {
  test.setTimeout(180_000);
  await signIn(page);
  await page.goto('/admin/products/new');

  await page.getByLabel('Part number', { exact: true }).fill(part);
  await page.getByLabel('Manufacturer', { exact: true }).fill('Test Maker');
  await page.getByLabel('Manufacturer part number').fill(part);
  await page.getByLabel('Category', { exact: true }).selectOption('Power');
  await page.getByLabel('Name', { exact: true }).fill('Test regulator for the editor');
  await page.getByLabel('What it does, in one sentence').fill('Holds a steady voltage for the editor test.');
  await page.getByLabel('Description', { exact: true }).fill('A made-up part used to prove the product editor end to end.');
  await page.getByLabel('Package', { exact: true }).fill('TO-220');
  await page.getByLabel('Mounting', { exact: true }).fill('Through-hole');
  await page.getByLabel('Price', { exact: true }).fill('77');
  await page.getByLabel('Count on the shelf', { exact: true }).fill('5');
  await page.getByLabel('Spec 1 label').fill('Output voltage');
  await page.getByLabel('Spec 1 value').fill('5 V');
  await page.getByLabel('Spec 2 label').fill('Current');
  await page.getByLabel('Spec 2 value').fill('1 A');
  await page.getByLabel('Output voltage', { exact: true }).check();
  await page.getByLabel('Current', { exact: true }).check();
  await page.getByLabel('What is in the bag').fill('One loose part');

  await page.locator('#photo-input').setInputFiles({ name: 'part.png', mimeType: 'image/png', buffer: png(500) });
  await expect(page.locator('#upload-status')).toContainText('added', { timeout: 30_000 });
  await page.getByLabel('New photo description').fill('A plain grey test image.');

  await page.getByRole('button', { name: 'Create product' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Product created.' })).toBeVisible();
  await expect(page.getByLabel('Part number', { exact: true })).toHaveValue(part);

  await page.goto(`/product/${slug}`);
  await expect(page.getByRole('heading', { name: 'Test regulator for the editor' })).toBeVisible();
  await expect(page.getByText('5 in stock').first()).toBeVisible();
  await expect(page.locator('.qty-row .buy-add')).toHaveText('Add to cart · Rs 77');
  const src = await page.locator('.gallery img').first().getAttribute('src');
  expect(src).toMatch(/^\/media\/.+-(640|1024)\.webp$/);
  const image = await request.get(src ?? '/missing');
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toBe('image/webp');
  expect(image.headers()['cache-control']).toContain('immutable');

  await page.goto('/');
  await expect(page.getByText(part).first()).toBeVisible();

  await page.goto(`/admin/products/${part}`);
  await page.getByRole('button', { name: 'Hide product' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Hidden from the shop.' })).toBeVisible();
  const gone = await request.get(`/product/${slug}`);
  expect(gone.status()).toBe(404);
});

test('a bad form keeps what was typed and names each problem', async ({ page }) => {
  await signIn(page);
  await page.goto('/admin/products/new');
  await page.getByLabel('Name', { exact: true }).fill('Half done');
  await page.getByLabel('Price', { exact: true }).fill('45.5');
  await page.getByRole('button', { name: 'Create product' }).click();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Half done');
  await expect(page.getByText('Price must be a whole number of rupees.')).toBeVisible();
  await expect(page.getByText('Enter the part number.').or(page.getByText('Use letters, numbers'))).toBeVisible();
  await expect(page.getByText('Choose a category.')).toBeVisible();
});

test('an upload that is not an image is refused', async ({ page, request }) => {
  await signIn(page);
  const response = await page.request.post('/admin/media/upload', {
    multipart: { part_number: part, width: '500', height: '500', w112: { name: 'a.webp', mimeType: 'image/webp', buffer: Buffer.from('not an image at all, just text') }, w640: { name: 'b.webp', mimeType: 'image/webp', buffer: Buffer.from('nope nope nope nope nope') }, w1024: { name: 'c.webp', mimeType: 'image/webp', buffer: Buffer.from('nope nope nope nope nope') } },
    headers: { Origin: 'http://localhost:4321' },
  });
  expect(response.status()).toBe(400);
  const anon = await request.post('/admin/media/upload', { multipart: { part_number: part }, headers: { Origin: 'http://localhost:4321' } });
  expect(anon.status()).toBe(404);
});
