import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";

test("axe finds no WCAG A/AA violations on the catalog", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Catalog" })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("axe finds no WCAG A/AA violations on the home page", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { level: 1, name: "Parts from Hall Road, counted before you pay." })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("axe finds no WCAG A/AA violations on the longest part page", async ({ page }) => {
  await page.goto("/product/esp32-wroom-32d");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("axe finds no WCAG A/AA violations on an unknown order", async ({ page }) => {
  await page.goto("/order-success/not-a-real-order");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("axe finds no WCAG A/AA violations on the component gallery", async ({ page }) => {
  await page.goto("/dev/components");
  await expect(page.getByRole("heading", { name: "Catalog table" })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("axe finds no WCAG A/AA violations in the search dialog", async ({ page }) => {
  await page.goto("/");
  await page.locator("#search-open[data-ready='true']").waitFor();
  await page.keyboard.press("/");
  await expect(page.getByRole("dialog", { name: "Search parts" })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("axe finds no WCAG A/AA violations in the cart sheet", async ({ page }) => {
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
  await page.goto("/");
  await page.locator("#cart-button[data-ready='true']").waitFor();
  await page.getByRole("button", { name: /Cart \d+ parts?/ }).click();
  await expect(page.getByRole("dialog", { name: "Cart" })).toBeVisible();
  await expectNoAxeViolations(page);
});
