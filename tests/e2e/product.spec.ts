import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";

test("product page buy panel, specs, and no horizontal overflow", async ({ page }, testInfo) => {
  await page.goto("/product/lm7805");
  await expect(page).toHaveTitle("LM7805 5 V, 1 A, TO-220 linear regulator | Lahore Silicon");
  await expect(page.getByRole("heading", { level: 1, name: "5 V, 1 A, TO-220 linear regulator" })).toBeVisible();
  await expect(page.locator(".summary")).toHaveText("Turns 7–35 V into a steady 5 V at up to 1 A.");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Catalog");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Power");
  const crumbGap = await page.evaluate(() => {
    const header = document.querySelector(".site-header");
    const crumb = document.querySelector(".crumb");
    if (!(header instanceof HTMLElement) || !(crumb instanceof HTMLElement)) return -1;
    return crumb.getBoundingClientRect().top - header.getBoundingClientRect().bottom;
  });
  expect(crumbGap).toBeGreaterThanOrEqual(14);
  expect(crumbGap).toBeLessThanOrEqual(18);
  await expect(page.locator(".tab")).toContainText("LM7805");
  await expect(page.locator(".tab")).toContainText("Texas Instruments");
  await expect(page.locator(".price-line")).toContainText("48 in stock");
  await expect(page.locator(".qty-row .buy-add")).toHaveText("Add to cart · Rs 45");
  await expect(page.locator(".eta-detail")).toContainText("Delivery cost is confirmed from your city, before you pay.");
  await expect(page.locator(".eta-lead")).toContainText(/Order within|Order now for dispatch|Dispatch resumes/);
  await expect(page.getByRole("heading", { name: "Key figures" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Specifications" })).toBeVisible();
  const specifications = page.getByRole("region", { name: "Specifications" });
  await expect(specifications.locator(".spec-panel")).toContainText("Output voltage");
  await expect(specifications.locator(".spec-panel")).toContainText("5 V");
  await expect(page.getByRole("link", { name: "Datasheet" })).toHaveAttribute(
    "href",
    "https://www.ti.com/lit/ds/symlink/lm340.pdf",
  );
  await expect(page.getByRole("heading", { name: "Pinout" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Questions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "You will also need" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Report within 24 hours" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ask on WhatsApp" })).toHaveCount(0);
  await expect(page.getByText("Representative studio photograph, not a photo of the lot in the drawer.")).toBeVisible();

  const width = page.viewportSize()?.width ?? 0;
  if (width >= 900) {
    await expect(page.locator(".buy-panel")).toHaveCSS("position", "sticky");
    await expect(page.locator(".buy-bar")).toBeHidden();
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await page.screenshot({
    path: `test-results/product-review/${testInfo.project.name}-lm7805-full.png`,
    fullPage: true,
  });
  await page.locator(".pdp").screenshot({
    path: `test-results/product-review/${testInfo.project.name}-lm7805-buy.png`,
  });
});

test("longest part numbers stay inside the viewport", async ({ page }, testInfo) => {
  for (const path of ["/product/esp32-wroom-32d", "/product/srd-05vdc-sl-c"]) {
    await page.goto(path);
    await expect(page.locator(".gallery-well, .fallback").first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
  await page.goto("/product/esp32-wroom-32d");
  await expect(page.locator(".qty-row .buy-add")).toHaveText("Add to cart · Rs 1,250");
  await expect(page.getByRole("heading", { name: "Pinout" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "You will also need" })).toBeVisible();
  await expect(page.getByRole("link", { name: /AMS1117-3.3/ })).toBeVisible();
  await page.screenshot({
    path: `test-results/product-review/${testInfo.project.name}-esp32.png`,
    fullPage: false,
  });
});

test("search lm 7805, add, correct quantity, and match the cart price", async ({ page }) => {
  await page.goto("/");
  await page.locator("#search-open[data-ready='true']").waitFor();
  await page.keyboard.press("/");
  const search = page.getByRole("dialog", { name: "Search parts" });
  await search.getByRole("combobox", { name: "Search parts" }).fill("lm 7805");
  await search.getByRole("option", { name: /LM7805/ }).click();
  await expect(page).toHaveURL(/\/product\/lm7805$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("5 V, 1 A, TO-220 linear regulator");
  await expect(page.locator(".eta-lead")).not.toBeEmpty();

  const qty = page.getByRole("textbox", { name: "Quantity for LM7805" });
  await qty.fill("999");
  await qty.blur();
  await expect(page.locator("#qty-note-LM7805")).toHaveText("Only 48 in stock");
  await expect(page.locator(".qty-row .buy-add")).toHaveText(/Add to cart · Rs 2,160/);

  await qty.fill("1");
  await qty.blur();
  await expect(page.locator(".qty-row .buy-add")).toHaveText("Add to cart · Rs 45");
  await page.locator(".qty-row .buy-add").click();
  await expect(page.locator(".qty-row .buy-add")).toHaveText("Added");

  const cart = page.getByRole("dialog", { name: "Cart" });
  await expect(cart).toBeVisible();
  await expect(cart.getByText("Added LM7805 to cart")).toBeVisible();
  await expect(cart.getByText("Rs 45").first()).toBeVisible();

  await page.goto("/checkout");
  await expect(page.locator("#summary-total")).toHaveText("Rs 45");
  await expect(page.locator("#summary-merchandise")).toHaveText("Rs 45");
});

test("mobile sticky add bar and desktop keyboard focus", async ({ page }) => {
  await page.goto("/product/lm7805");
  await expect(page.locator(".eta-lead")).not.toBeEmpty();
  const width = page.viewportSize()?.width ?? 0;
  const add = page.locator(".qty-row .buy-add");

  if (width < 900) {
    const bar = page.locator(".buy-bar");
    await expect(bar).toBeVisible();
    const barBox = await bar.boundingBox();
    const viewport = page.viewportSize();
    expect(barBox).toBeTruthy();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(barBox!.y).toBeGreaterThanOrEqual(0);
    expect(barBox!.y + barBox!.height).toBeLessThanOrEqual((viewport?.height ?? 0) + 1);
    await expect(bar.locator(".unit-price")).toContainText("Rs");
    await expect(bar.locator(".buy-add")).toHaveText("Add to cart · Rs 45");

    await page.locator(".qty-row .buy-add").evaluate((button) => {
      const header = document.querySelector(".site-header");
      const headerBottom = header instanceof HTMLElement ? header.getBoundingClientRect().height : 0;
      const top = button.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top - headerBottom + button.getBoundingClientRect().height + 24);
    });
    await expect(page.locator(".buy-bar")).toBeVisible();
    await page.locator(".buy-bar .buy-add").click();
    const cart = page.getByRole("dialog", { name: "Cart" });
    await expect(cart).toBeVisible();
    await expect(cart.getByText("Added LM7805 to cart")).toBeVisible();
    await expect(cart.getByRole("button", { name: "Close cart" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(cart).toBeHidden();
  } else {
    await expect(page.locator(".buy-bar")).toBeHidden();
  }

  await page.locator(".qty-row").evaluate((el) => {
    document.documentElement.style.scrollBehavior = "auto";
    el.scrollIntoView({ block: "center" });
  });
  const qty = page.getByRole("complementary", { name: "Buy LM7805" }).getByRole("textbox", { name: "Quantity for LM7805" });
  await qty.focus();
  await page.keyboard.press("Tab");
  const increase = page.getByRole("complementary", { name: "Buy LM7805" }).getByRole("button", { name: "Increase LM7805" });
  await expect(increase).toBeFocused();
  const headerBottom = await page.locator(".site-header").evaluate((el) => el.getBoundingClientRect().bottom);
  const box = await increase.boundingBox();
  expect(box?.y ?? 0).toBeGreaterThanOrEqual(headerBottom - 1);
  const outline = await increase.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");

  await add.hover();
  const hovered = await add.evaluate((el) => getComputedStyle(el).backgroundColor);
  const resting = await page.locator(".buy-ask").count();
  expect(resting).toBe(0);
  expect(hovered).not.toBe("rgba(0, 0, 0, 0)");

  const point = await add.boundingBox();
  if (point) {
    await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2);
    await page.mouse.down();
    const transform = await add.evaluate((el) => getComputedStyle(el).transform);
    await page.mouse.up();
    expect(transform).not.toBe("none");
  }

  const thumb = await page.locator(".thumb.is-current").evaluate((el) => getComputedStyle(el).boxShadow);
  expect(thumb).toContain("inset");
});

test("reduced motion keeps the add control still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/product/lm7805");
  await expect(page.locator(".gallery-well img")).toBeVisible();
  const animation = await page.locator(".product-page").evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe("none");
  const transition = await page.locator(".qty-row .buy-add").evaluate((el) => getComputedStyle(el).transitionProperty);
  expect(transition).not.toContain("transform");
  const point = await page.locator(".qty-row .buy-add").boundingBox();
  if (point) {
    await page.mouse.move(point.x + 8, point.y + 8);
    await page.mouse.down();
    const transform = await page.locator(".qty-row .buy-add").evaluate((el) => getComputedStyle(el).transform);
    await page.mouse.up();
    expect(transform).toBe("none");
  }
});

test("axe finds no WCAG A/AA violations on the product page", async ({ page }) => {
  await page.goto("/product/lm7805");
  await expect(page.locator(".eta-lead")).not.toBeEmpty();
  await expectNoAxeViolations(page);
});

test("layout at the 900px switch", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "1440", "one shot of the breakpoint");
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto("/product/lm7805");
  await expect(page.locator(".buy-panel")).toHaveCSS("position", "sticky");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: "test-results/product-review/900-lm7805.png",
    fullPage: true,
  });
});
