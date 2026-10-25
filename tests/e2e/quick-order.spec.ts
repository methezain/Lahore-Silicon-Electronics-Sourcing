import { expect, test } from "@playwright/test";

const LIST = ["LM7805 x10", "NE555, 5", "ams1117 3.3 - 20", "TIP120 x2", "ESP32-WROOM-32D x20"].join("\n");

test("quick order previews matches, misses, stock limits, and adds them", async ({ page }) => {
  await page.goto(`/quick-order?list=${encodeURIComponent(LIST)}`);
  await expect(page.getByRole("heading", { level: 1, name: "Quick order" })).toBeVisible();
  const summary = page.locator("#quick-order-summary");
  await expect(summary).toContainText("4 parts match");
  await expect(summary).toContainText("1 is not stocked");
  await expect(summary).toContainText("1 quantity was set to the stock count");
  await expect(page.getByText("We don't stock \"TIP120\".")).toBeVisible();
  await expect(page.getByText(/ESP32-WROOM-32D: Only \d+ in stock\. Quantity set to \d+\./)).toBeVisible();
  await expect(page.locator("#main").getByText("AMS1117-3.3")).toBeVisible();

  const configured = await page.locator("footer a[href^='https://wa.me/']").count();
  const send = page.getByRole("link", { name: "Send cart on WhatsApp" });
  if (configured) await expect(send.first()).toBeVisible();
  else await expect(send).toHaveCount(0);

  await page.getByRole("button", { name: "Add 4 parts to cart" }).click();
  const cart = page.getByRole("dialog", { name: "Cart" });
  await expect(cart).toBeVisible();
  await expect(cart.getByText("Added 4 parts to cart")).toBeVisible();
  await expect(cart.getByText("LM7805")).toBeVisible();
  await expect(cart.getByText("AMS1117-3.3")).toBeVisible();
  await expect(cart.getByText("TIP120")).toHaveCount(0);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("a cart link rebuilds the cart", async ({ page }) => {
  await page.goto("/quick-order?cart=LM7805:2,NE555:4");
  await expect(page.getByRole("button", { name: /Cart 2 parts/ })).toBeVisible();
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy cart link" }).click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("/quick-order?cart=");
  expect(copied).toContain("LM7805");
  expect(copied).toContain("NE555");
});

test("command palette opens with ctrl+k and highlights a match", async ({ page }) => {
  await page.goto("/");
  await page.locator('#search-open').hover();
  await page.locator("#search-open[data-ready='true']").waitFor();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search parts" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("group", { name: "Parts" })).toBeVisible();
  await expect(dialog.getByRole("group", { name: "Categories" })).toBeVisible();
  await expect(dialog.getByRole("group", { name: "Pages" })).toBeVisible();
  const search = dialog.getByRole("combobox", { name: "Search parts" });
  await search.fill("lm 7805");
  const hit = dialog.getByRole("option", { name: /LM7805/ });
  await expect(hit.locator("mark")).toHaveText("LM7805");
  await page.keyboard.press("Control+k");
  await expect(dialog).toBeHidden();
});

test("selection highlight slides, and jumps when reduced motion is on", async ({ page }, testInfo) => {
  const dir = "test-results/r6";
  await page.goto("/");
  await page.locator('#search-open').hover();
  await page.locator("#search-open[data-ready='true']").waitFor();
  await page.keyboard.press("/");
  const dialog = page.getByRole("dialog", { name: "Search parts" });
  const search = dialog.getByRole("combobox", { name: "Search parts" });
  await search.fill("5v");
  const bar = dialog.locator(".search-selection");
  await expect(bar).toBeVisible();
  await page.waitForTimeout(50);
  const before = await bar.evaluate((node) => (node as HTMLElement).style.transform);
  await page.keyboard.press("ArrowDown");
  const samples = [before];
  for (let step = 0; step < 6; step += 1) {
    samples.push(await bar.evaluate((node) => (node as HTMLElement).style.transform));
    await page.screenshot({ path: `${dir}/slide-${testInfo.project.name}-${step}.png` });
    await page.waitForTimeout(40);
  }
  expect(new Set(samples.filter(Boolean)).size).toBeGreaterThan(1);

  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.keyboard.press("/");
  await expect(search).toBeFocused();
  await search.fill("5v");
  await expect(bar).toBeVisible();
  await page.waitForTimeout(50);
  await page.keyboard.press("ArrowDown");
  const first = await bar.evaluate((node) => (node as HTMLElement).style.transform);
  await page.waitForTimeout(80);
  const later = await bar.evaluate((node) => (node as HTMLElement).style.transform);
  expect(first).toBe(later);
  expect(first).not.toBe("");
  await page.screenshot({ path: `${dir}/slide-reduced-${testInfo.project.name}.png` });
});

test("palette and quick order screenshots", async ({ page }, testInfo) => {
  const dir = "test-results/r6";
  const name = testInfo.project.name;
  await page.goto("/");
  await page.locator('#search-open').hover();
  await page.locator("#search-open[data-ready='true']").waitFor();
  await page.keyboard.press("/");
  const dialog = page.getByRole("dialog", { name: "Search parts" });
  await dialog.getByRole("combobox", { name: "Search parts" }).fill("lm 7805");
  await expect(dialog.getByRole("option", { name: /LM7805/ })).toBeVisible();
  await page.screenshot({ path: `${dir}/palette-${name}.png` });
  await dialog.getByRole("button", { name: "Parts list" }).click();
  await dialog.getByRole("textbox", { name: "Parts list" }).fill(LIST);
  await expect(dialog.getByText("We don't stock \"TIP120\".")).toBeVisible();
  await page.screenshot({ path: `${dir}/palette-list-${name}.png` });
  await page.keyboard.press("Escape");
  await page.goto(`/quick-order?list=${encodeURIComponent(LIST)}`);
  await expect(page.locator("#quick-order-summary")).toBeVisible();
  await page.screenshot({ path: `${dir}/quick-order-${name}.png`, fullPage: true });
});
