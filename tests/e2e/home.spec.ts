import { expect, test } from '@playwright/test';

test('home page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Lahore Silicon/);
  await expect(page.getByRole('heading', { level: 1, name: 'Parts from Hall Road, counted before you pay.' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('header and footer shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner').getByRole('link', { name: 'Lahore Silicon' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Cart \d+ parts?/ })).toBeVisible();
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
  const openSearch = page.locator('#search-open');
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

  const cart = page.getByRole('button', { name: /Cart \d+ parts?/ });
  await cart.click();
  await expect(page.getByRole('dialog', { name: 'Cart' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Cart' })).toBeHidden();
  await expect(cart).toBeFocused();
});

test('home sections, deck, and category filter', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.status')).toContainText(/Dispatching today|Order now for dispatch|Dispatch resumes/);
  await expect(page.getByRole('heading', { name: 'What are you building?' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Microcontrollers and radios/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Regulators/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'On the counter today' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Three steps, and you pay the total shown.' })).toBeVisible();
  const facts = page.locator('.facts');
  await expect(facts.getByText('1 business day', { exact: true })).toBeVisible();
  await expect(facts.getByText('48–72 hours', { exact: true })).toBeVisible();
  await expect(facts.getByText('Report within 24 hours', { exact: true })).toBeVisible();

  const width = page.viewportSize()?.width ?? 0;
  const deck = page.locator('.deck');
  if (width >= 900) {
    await expect(deck).toBeVisible();
    await expect(deck.getByRole('link', { name: /LM2596S/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Price' })).toBeVisible();
  } else {
    await expect(deck).toBeHidden();
    await expect(page.locator("#catalog").getByRole("link", { name: /ESP32-WROOM-32D/ })).toBeVisible();
  }

  await page.locator('#search-open[data-ready="true"]').waitFor();
  const dock = page.locator('#hero-search');
  await dock.click();
  await expect(page.getByRole('dialog', { name: 'Search parts' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Search parts' })).toBeHidden();
  await expect(dock).toBeFocused();

  await page.goto('/?category=Relays#catalog');
  await expect(page.getByRole('link', { name: 'SRD-05VDC-SL-C' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'LM7805', exact: true })).toHaveCount(0);

  await page.goto('/?category=Nope');
  await expect(page.getByText('No parts in Nope.')).toBeVisible();

  if (width >= 900) {
    await page.goto('/?sort=price#catalog');
    await expect(page.getByRole('columnheader', { name: 'Price' })).toHaveAttribute('aria-sort', 'ascending');
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('hero copy stays put when motion is reduced', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.intro')).toHaveCSS('animation-name', 'none');
});
