import { expect, test } from '@playwright/test';

test('catalog is the front door', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Catalog \| Lahore Silicon/);
  await expect(page.getByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Parts from Hall Road, counted before you pay.' })).toHaveCount(0);
  await expect(page.locator('.home-hero')).toHaveCount(0);
  await expect(page.locator('#ordering')).toHaveCount(0);

  const width = page.viewportSize()?.width ?? 0;
  if (width >= 900) {
    await expect(page.getByRole('columnheader', { name: 'Price' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ESP32-WROOM-32D' })).toBeVisible();
  } else {
    await expect(page.locator('#catalog').getByRole('link', { name: /ESP32-WROOM-32D/ })).toBeVisible();
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('header and footer shell', async ({ page }) => {
  await page.goto('/');
  const logo = page.getByRole('banner').getByRole('link', { name: 'Lahore Silicon' });
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute('href', '/');
  await expect(page.getByRole('button', { name: /Cart \d+ parts?/ })).toBeVisible();
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'All parts' })).toHaveAttribute('href', '/');
  await expect(footer.getByRole('link', { name: 'Shipping and payment' })).toBeVisible();
  await expect(footer.getByText(/Parts from Hall Road, Lahore\. Monday to Saturday/)).toBeVisible();
  await expect(footer.getByText(/dispatched the same day/)).toBeVisible();
  await expect(page.locator('.footer-wordmark')).toHaveCount(0);

  const width = page.viewportSize()?.width ?? 0;
  const nav = page.getByRole('navigation', { name: 'Primary' });
  if (width >= 900) {
    await expect(nav.getByRole('link')).toHaveText(['Catalog', 'Home', 'Shipping', 'Contact']);
    await expect(nav.getByRole('link', { name: 'Catalog' })).toHaveAttribute('href', '/');
    await expect(nav.getByRole('link', { name: 'Catalog' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/home');
    await expect(nav.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'How ordering works' })).toHaveCount(0);
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

test('category and sort queries still filter the catalog', async ({ page }) => {
  await page.goto('/?category=Relays#catalog');
  const relays = page.locator('#catalog');
  await expect(page.getByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible();
  await expect(relays.getByRole('link', { name: /SRD-05VDC-SL-C/ })).toBeVisible();
  await expect(relays.getByRole('link', { name: /LM7805/ })).toHaveCount(0);

  await page.goto('/?category=Power');
  const power = page.locator('#catalog');
  await expect(power.getByRole('link', { name: /LM7805/ })).toBeVisible();
  await expect(power.getByRole('link', { name: /SRD-05VDC-SL-C/ })).toHaveCount(0);

  await page.goto('/?category=Nope');
  await expect(page.getByText('No parts in Nope.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Show all' })).toHaveAttribute('href', '/');

  const width = page.viewportSize()?.width ?? 0;
  if (width >= 900) {
    await page.goto('/?sort=price#catalog');
    await expect(page.getByRole('columnheader', { name: 'Price' })).toHaveAttribute('aria-sort', 'ascending');
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('home page is the brand landing', async ({ page }) => {
  await page.goto('/home');
  await expect(page).toHaveTitle(/Home \| Lahore Silicon/);
  await expect(page.getByRole('heading', { level: 1, name: 'Parts from Hall Road, counted before you pay.' })).toBeVisible();
  await expect(page.locator('.status')).toContainText(/Dispatching today|Order now for dispatch|Dispatch resumes/);
  await expect(page.getByRole('heading', { name: 'What are you building?' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Microcontrollers and radios/ })).toHaveAttribute('href', '/?category=Boards#catalog');
  await expect(page.getByRole('link', { name: /Regulators/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'On the counter today' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'From Hall Road to your bench' })).toBeVisible();
  await expect(page.locator('#story').getByText('TO-220', { exact: true })).toBeVisible();
  await expect(page.locator('#story').getByText('Relay module', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Counted on the counter' })).toBeVisible();
  await expect(page.locator('#stock').getByRole('link', { name: /LM7805/ })).toContainText(/\d+ in stock/);
  await expect(page.locator('#stock').getByRole('link', { name: /ESP32-WROOM-32D/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse the catalog' })).toHaveAttribute('href', '/');
  await expect(page.getByRole('heading', { name: 'See every part on the counter.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open the catalog' })).toHaveAttribute('href', '/');
  await expect(page.locator('.footer-wordmark')).toHaveText('Lahore Silicon');
  await expect(page.getByRole('banner').getByRole('link', { name: 'Lahore Silicon' })).toHaveAttribute('href', '/');
  await expect(page.locator('.connector')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Three steps, and you pay the total shown.' })).toBeVisible();
  const facts = page.locator('.facts');
  await expect(facts.getByText('1 business day', { exact: true })).toBeVisible();
  await expect(facts.getByText('48–72 hours', { exact: true })).toBeVisible();
  await expect(facts.getByText('Report within 24 hours', { exact: true })).toBeVisible();

  const width = page.viewportSize()?.width ?? 0;
  const nav = page.getByRole('navigation', { name: 'Primary' });
  const deck = page.locator('.deck');
  if (width >= 900) {
    await expect(deck).toBeVisible();
    await expect(deck.getByRole('link', { name: /LM2596S/ })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Catalog' })).not.toHaveAttribute('aria-current', 'page');
  } else {
    await expect(deck).toBeHidden();
    await expect(nav).toBeHidden();
  }

  await page.locator('#search-open[data-ready="true"]').waitFor();
  const dock = page.locator('#hero-search');
  await dock.click();
  await expect(page.getByRole('dialog', { name: 'Search parts' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Search parts' })).toBeHidden();
  await expect(dock).toBeFocused();

  const stockLink = page.locator('#stock a').first();
  await stockLink.focus();
  await page.keyboard.press('Tab');
  const nextStock = page.locator('#stock a').nth(1);
  await expect(nextStock).toBeFocused();
  const stockOutline = await nextStock.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(stockOutline).not.toBe('none');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('a catalog row opens the product and Add stays on the catalog', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 900, 'The catalog is a table from 900px.');
  await page.goto('/');
  const row = page.locator('.cat-table tbody tr', { hasText: 'LM7805' });
  await expect(row).toBeVisible();
  await expect(row).toHaveCSS('cursor', 'pointer');

  const edges = await row.evaluate((node) => {
    function contentLeft(cell: Element) {
      const style = getComputedStyle(cell);
      return cell.getBoundingClientRect().left + Number.parseFloat(style.paddingLeft);
    }
    const headers = [...document.querySelectorAll('.cat-table th')];
    const stockHeader = headers.find((cell) => cell.textContent?.trim() === 'Stock');
    const priceHeader = headers.find((cell) => cell.textContent?.trim() === 'Price');
    const stock = node.querySelector('.stock-num');
    const priceCell = node.querySelector('td.price');
    if (!stockHeader || !priceHeader || !stock || !priceCell) return null;
    const range = document.createRange();
    range.selectNodeContents(priceCell);
    return {
      stockHeader: contentLeft(stockHeader),
      stock: stock.getBoundingClientRect().left,
      priceHeader: contentLeft(priceHeader),
      price: range.getBoundingClientRect().left,
      stockAlign: getComputedStyle(stockHeader).textAlign,
      priceAlign: getComputedStyle(priceHeader).textAlign,
    };
  });
  expect(edges).not.toBeNull();
  expect(edges?.stockAlign).toBe('left');
  expect(edges?.priceAlign).toBe('left');
  expect(Math.abs((edges?.stock ?? 0) - (edges?.stockHeader ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((edges?.price ?? 0) - (edges?.priceHeader ?? 0))).toBeLessThanOrEqual(1);

  const link = row.getByRole('link', { name: 'LM7805' });
  const add = row.getByRole('button', { name: 'Add LM7805 to cart' });
  await link.focus();
  await page.keyboard.press('Tab');
  await expect(add).toBeFocused();
  const addOutline = await add.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(addOutline).not.toBe('none');
  await page.keyboard.press('Shift+Tab');
  await expect(link).toBeFocused();
  const ring = await link.evaluate((el) => getComputedStyle(el, '::after').outlineStyle);
  expect(ring).not.toBe('none');

  await add.click();
  expect(new URL(page.url()).pathname).toBe('/');
  const cart = page.getByRole('dialog', { name: 'Cart' });
  await expect(cart).toBeVisible();
  await expect(cart.getByText('Added LM7805 to cart')).toBeVisible();
  const cartImg = cart.locator('.cart-photo img');
  await expect(cartImg).toBeVisible();
  await expect(cartImg).toHaveAttribute('src', /webp/i);
  await expect.poll(async () => cartImg.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(cart).toBeHidden();

  const job = await row.locator('td.job').boundingBox();
  expect(job).not.toBeNull();
  await page.mouse.click(job!.x + job!.width / 2, job!.y + job!.height / 2);
  await expect(page).toHaveURL(/\/product\/lm7805$/);
});

test('hero copy stays put when motion is reduced', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/home');
  await expect(page.locator('.intro')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.mask .rise').first()).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.grid-lines path').first()).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.spot')).toHaveCSS('display', 'none');
  await expect(page.locator('.home-reveal').first()).toHaveCSS('animation-name', 'none');
});
