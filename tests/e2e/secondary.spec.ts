import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import { partsListRule } from '../../src/lib/desk';
import { pageMissing, serverBroke } from '../../src/lib/order';
import { phoneRule } from '../../src/lib/phone';
import {
  defectNotice,
  deliveryCost,
  noCashOnDelivery,
  remoteDelivery,
  returnRule,
} from '../../src/lib/shipping';

const require = createRequire(import.meta.url);

async function overflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function axeViolations(page: Page) {
  await page.addScriptTag({ path: require.resolve('axe-core') });
  return page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: {
        run: (
          context: Document,
          options: { runOnly: { type: 'tag'; values: string[] } },
        ) => Promise<{
          violations: { id: string; impact: string | null; help: string; nodes: { target: string[] }[] }[];
        }>;
      };
    }).axe;
    const result = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    return result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.slice(0, 3).map((node) => node.target.join(' ')),
    }));
  });
}

test('shipping and payment renders the policy modules', async ({ page }, testInfo) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const response = await page.goto('/shipping-and-payments');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Shipping and payment' })).toBeVisible();
  const policy = page.locator('article');
  await expect(policy.getByText(noCashOnDelivery)).toBeVisible();
  await expect(policy.getByText(deliveryCost)).toBeVisible();
  await expect(policy.getByText(remoteDelivery)).toBeVisible();
  await expect(policy.locator('#defects')).toContainText(returnRule);
  await expect(policy.getByText(defectNotice)).toBeVisible();
  await expect(page.locator('#dispatch')).toBeVisible();
  await expect(page.locator('#delivery')).toBeVisible();
  await expect(page.locator('#payment')).toBeVisible();
  await expect(page.locator('#defects')).toBeVisible();
  await expect(page.locator('#returns')).toBeVisible();
  await page.goto('/shipping-and-payments#returns');
  await expect(page.locator('#returns')).toBeInViewport();

  const copy = page.locator('.copy-btn');
  if (await copy.count()) {
    await copy.first().click();
    await expect(copy.first()).toHaveText('Copied');
    await expect(page.locator('#copy-status')).toHaveText('Copied');
  }

  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: `test-results/secondary-review/${testInfo.project.name}-shipping.png`,
    fullPage: true,
  });
});

test('about states only what the catalog and the modules can prove', async ({ page }, testInfo) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { name: 'A counter on Hall Road.' })).toBeVisible();
  const about = page.locator('article');
  await expect(about.getByText(/The catalog has \d+ parts/)).toBeVisible();
  await expect(about.getByText('Every part is physically inspected before dispatch.')).toBeVisible();
  await expect(about.getByText('Monday to Saturday, 9:00 AM – 6:00 PM PKT. Sunday closed.')).toBeVisible();
  await expect(about.getByText('Hall Road, Lahore', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /map/i })).toHaveCount(0);
  await expect(page.locator('article img')).toHaveCount(0);
  await expect(page.locator('#main').getByRole('link', { name: 'All parts' })).toBeVisible();

  const allParts = page.locator('#main').getByRole('link', { name: 'All parts' });
  await allParts.hover();
  const rested = await allParts.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(rested).not.toBe('rgba(0, 0, 0, 0)');
  const point = await allParts.boundingBox();
  if (point) {
    await page.mouse.move(point.x + 8, point.y + 8);
    await page.mouse.down();
    const pressed = await allParts.evaluate((el) => getComputedStyle(el).transform);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    expect(pressed).not.toBe('none');
  }

  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: `test-results/secondary-review/${testInfo.project.name}-about.png`,
    fullPage: true,
  });
});

test('contact keeps the typed value and names the broken rule', async ({ page }, testInfo) => {
  await page.goto('/contact');
  await expect(page.getByRole('heading', { name: 'Contact' })).toBeVisible();
  await expect(page.locator('article').getByText('Hall Road, Lahore', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /map/i })).toHaveCount(0);
  expect(await overflow(page)).toBeLessThanOrEqual(1);

  const form = page.locator('#sourcing-form');
  if (await form.count()) {
    await page.getByLabel('Phone').focus();
    const headerBottom = await page.locator('.site-header').evaluate((el) => el.getBoundingClientRect().bottom);
    const phoneBox = await page.getByLabel('Phone').boundingBox();
    expect(phoneBox?.y ?? 0).toBeGreaterThanOrEqual(headerBottom - 1);
    const ring = await page.locator('#quote-phone-wrap').evaluate((el) => getComputedStyle(el).boxShadow);
    expect(ring).not.toBe('none');

    await page.getByRole('link', { name: 'Send on WhatsApp' }).click();
    await expect(page.getByText(phoneRule)).toBeVisible();
    await expect(page.getByText(partsListRule)).toBeVisible();
    await page.getByLabel('Phone').fill('03001234567');
    await page.getByLabel('Part numbers').fill('LM7805 × 2');
    await expect(page.getByLabel('Phone')).toHaveValue('03001234567');

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'Send on WhatsApp' }).click();
    const popup = await popupPromise;
    expect(popup.url()).toMatch(/wa\.me|whatsapp\.com/);
    expect(decodeURIComponent(popup.url())).toContain('LM7805');
    await popup.close();
    await expect(page.getByText(phoneRule)).toHaveCount(0);
    await expect(page.getByText(partsListRule)).toHaveCount(0);
    await expect(page.getByLabel('Part numbers')).toHaveValue('LM7805 × 2');
  }

  await page.screenshot({
    path: `test-results/secondary-review/${testInfo.project.name}-contact.png`,
    fullPage: true,
  });
});

test('missing pages and unknown parts', async ({ page }, testInfo) => {
  const missing = await page.goto('/no-such-page');
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: pageMissing })).toBeVisible();
  await expect(page.locator('article').getByRole('link', { name: /Power/ })).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: `test-results/secondary-review/${testInfo.project.name}-404.png`,
    fullPage: true,
  });

  await page.locator('#search-open[data-ready="true"]').waitFor();
  await page.getByRole('button', { name: 'Search parts' }).click();
  const dialog = page.getByRole('dialog', { name: 'Search parts' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('#search-open')).toBeFocused();

  const odd = await page.goto('/product/LM-7805');
  expect(odd?.status()).toBe(200);
  await expect(page).toHaveURL(/\/product\/lm7805$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('5 V');

  const miss = await page.goto('/product/not-a-real-part');
  expect(miss?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: "We don't stock not-a-real-part." })).toBeVisible();

  const longPart = 'ESP32-WROOM-32D-NOT-IN-THE-CATALOG';
  await page.goto(`/product/${longPart}`);
  await expect(page.getByRole('heading', { name: `We don't stock ${longPart}.` })).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: `test-results/secondary-review/${testInfo.project.name}-missing-part.png`,
    fullPage: true,
  });

  const broken = await page.goto('/500');
  expect(broken?.status()).toBe(500);
  await expect(page.getByRole('heading', { name: serverBroke })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try again' })).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: `test-results/secondary-review/${testInfo.project.name}-500.png`,
    fullPage: true,
  });
});

test('axe finds no WCAG A/AA violations on the secondary pages', async ({ page }) => {
  for (const path of ['/shipping-and-payments', '/about', '/contact', '/no-such-page', '/500']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  }
});

test('layout at the 900px switch', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== '1440', 'one shot of the breakpoint');
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto('/about');
  await expect(page.locator('.split')).toHaveCSS('display', 'grid');
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/secondary-review/900-about.png', fullPage: true });
  await page.goto('/contact');
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/secondary-review/900-contact.png', fullPage: true });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('shipping controls do not animate a transform', async ({ page }) => {
    await page.goto('/about');
    const allParts = page.locator('#main').getByRole('link', { name: 'All parts' });
    const transition = await allParts.evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(transition).not.toContain('transform');
    const point = await allParts.boundingBox();
    if (point) {
      await page.mouse.move(point.x + 8, point.y + 8);
      await page.mouse.down();
      const transform = await allParts.evaluate((el) => getComputedStyle(el).transform);
      await page.mouse.up();
      expect(transform).toBe('none');
    }
  });
});

test('the header is solid when transparency is reduced', async ({ page }) => {
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
  });
  await page.goto('/about');
  const filter = await page.locator('.site-bar').evaluate((el) => getComputedStyle(el).backdropFilter);
  expect(filter === 'none' || filter === '').toBe(true);
});
