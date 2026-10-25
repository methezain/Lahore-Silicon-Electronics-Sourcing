import { expect, test, type Page } from "@playwright/test";

const shot = {
  animations: "disabled" as const,
  stylePath: "tests/e2e/visual-mask.css",
};

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const step = Math.max(window.innerHeight, 1);
    const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    window.scrollTo(0, 0);
    await Promise.all(
      [...document.images].map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            setTimeout(done, 4000);
          }),
      ),
    );
  });
}

async function seedLm7805(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "lahore_silicon_cart:LM7805",
      JSON.stringify({
        part_number: "LM7805",
        name: "5 V, 1 A, TO-220 linear regulator",
        quantity: 1,
      }),
    );
  });
}

test.describe("@visual", () => {
  test.setTimeout(60_000);
  test("home", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByRole("heading", { level: 1, name: "Parts from Hall Road, counted before you pay." })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("home.png", { ...shot, fullPage: true });
  });

  test("product", async ({ page }) => {
    await page.goto("/product/lm7805");
    await expect(page.locator(".gallery img").first()).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("product.png", { ...shot, fullPage: true });
  });

  test("cart open", async ({ page }) => {
    await seedLm7805(page);
    await page.goto("/");
    await page.locator("#cart-button[data-ready='true']").waitFor();
    await page.getByRole("button", { name: /Cart \d+ parts?/ }).click();
    const dialog = page.getByRole("dialog", { name: "Cart" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("LM7805").first()).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("cart.png", { ...shot, fullPage: false });
  });

  test("checkout", async ({ page }) => {
    await seedLm7805(page);
    await page.goto("/checkout");
    await expect(page.locator("#summary-items .line-part")).toHaveText("LM7805");
    await settle(page);
    await expect(page).toHaveScreenshot("checkout.png", { ...shot, fullPage: true });
  });
});
