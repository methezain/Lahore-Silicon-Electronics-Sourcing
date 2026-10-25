import { expect, test } from "@playwright/test";

test("speculation rules prerender product links and skip checkout", async ({ page }) => {
  await page.goto("/");
  const rules = await page.locator('script[type="speculationrules"]').textContent();
  expect(rules).toContain('"eagerness":"moderate"');
  expect(rules).toContain("/product/*");
  expect(rules).toContain("/checkout");
  expect(rules).toContain('"/api/*"');
  await expect(page.locator("#catalog a.part-link, #catalog a.card-link").locator("visible=true").first()).toHaveAttribute(
    "data-astro-prefetch",
    "hover",
  );

  await page.goto("/product/lm7805");
  await page.locator(".qty-row .buy-add").click();
  await expect(page.locator(".cart-checkout")).toHaveAttribute("data-astro-prefetch", "false");
});

test("header condenses past 80px and restores at the top", async ({ page }) => {
  await page.goto("/");
  const width = page.viewportSize()?.width ?? 0;
  const bar = page.locator(".site-bar");
  await expect(bar).toHaveCSS("height", width >= 900 ? "64px" : "60px");
  const restingShadow = await bar.evaluate((el) => getComputedStyle(el).boxShadow);

  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 160);
  });
  await expect(page.locator(".site-header")).toHaveClass(/is-condensed/);
  await expect(bar).toHaveCSS("height", "52px");
  const condensedShadow = await bar.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(condensedShadow).not.toBe(restingShadow);
  expect(condensedShadow).toContain("48px");

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator(".site-header")).not.toHaveClass(/is-condensed/);
  await expect(bar).toHaveCSS("height", width >= 900 ? "64px" : "60px");
});

test("reduced motion drops morph names and condenses without a transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".site-bar")).toHaveCSS("transition-duration", "0s");
  const catalogName = await page
    .locator("#catalog img.vt-part-photo-lm7805:visible")
    .evaluate((el) => getComputedStyle(el).viewTransitionName);
  expect(catalogName).toBe("none");

  await page.goto("/product/lm7805");
  const photo = await page.locator(".gallery-well img").evaluate((el) => getComputedStyle(el).viewTransitionName);
  const chip = await page.locator(".buy-panel .chip").evaluate((el) => getComputedStyle(el).viewTransitionName);
  expect(photo).toBe("none");
  expect(chip).toBe("none");
  const animation = await page.locator(".buy-panel .title").evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe("none");
});

test("keyboard focus stays below the header after it condenses", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 320);
  });
  await expect(page.locator(".site-header")).toHaveClass(/is-condensed/);
  const link = page.locator("#catalog a.part-link, #catalog a.card-link").locator("visible=true").first();
  await link.focus();
  const headerBottom = await page.locator(".site-header").evaluate((el) => el.getBoundingClientRect().bottom);
  const top = await link.evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(headerBottom - 1);
  const ring = await link.evaluate((el) => {
    let node: Element | null = el;
    while (node) {
      const own = getComputedStyle(node).outlineStyle;
      if (own !== "none") return own;
      const after = getComputedStyle(node, "::after").outlineStyle;
      if (after !== "none") return after;
      node = node.parentElement;
    }
    return "none";
  });
  expect(ring).not.toBe("none");
});
