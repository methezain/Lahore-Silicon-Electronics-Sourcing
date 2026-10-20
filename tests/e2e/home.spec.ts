import { expect, test } from '@playwright/test';

test('home page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Lahore Silicon/);
  await expect(page.getByRole('heading', { level: 1, name: 'Parts, counted and priced.' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('header and footer shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner').getByRole('link', { name: 'Lahore Silicon' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Cart, \d+ parts?/ })).toBeVisible();
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'All parts' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Shipping and payment' })).toBeVisible();
  await expect(footer.getByText(/Parts from Hall Road, Lahore\. Monday to Saturday/)).toBeVisible();
  await expect(footer.getByText(/dispatched the same day/)).toBeVisible();

  const width = page.viewportSize()?.width ?? 0;
  const nav = page.getByRole('navigation', { name: 'Primary' });
  if (width >= 900) {
    await expect(nav.getByRole('link', { name: 'Catalog' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Catalog' })).toHaveAttribute('aria-current', 'page');
  } else {
    await expect(nav).toBeHidden();
  }
});

test('header search and cart keyboard path', async ({ page }) => {
  await page.goto('/');
  const openSearch = page.getByRole('button', { name: 'Search parts' });
  await page.locator('#search-open[data-ready="true"]').waitFor();
  await page.keyboard.press('/');
  const dialog = page.getByRole('dialog', { name: 'Search parts' });
  await expect(dialog).toBeVisible();
  const search = dialog.getByRole('combobox', { name: 'Search parts' });
  await expect(search).toBeFocused();
  await search.fill('LM7805');
  await expect(dialog.getByRole('option', { name: /LM7805/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(openSearch).toBeFocused();

  const cart = page.getByRole('button', { name: /Cart, \d+ parts?/ });
  await cart.click();
  await expect(page.getByRole('dialog', { name: 'Cart' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Cart' })).toBeHidden();
  await expect(cart).toBeFocused();
});
