import { expect, test } from "@playwright/test";

test("a field vital is accepted and an order id is not required", async ({ page }) => {
  await page.goto("/");
  const stored = await page.evaluate(async () => {
    const response = await fetch("/api/vitals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "LCP",
        value: 1234,
        path: "/order-success/not-a-real-order",
      }),
    });
    return response.status;
  });
  expect(stored).toBe(204);

  const rejected = await page.evaluate(async () => {
    const response = await fetch("/api/vitals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "LCP", value: 1, path: "/checkout?phone=0300" }),
    });
    return response.status;
  });
  expect(rejected).toBe(400);
});

test("the layout loads the web vitals reporter", async ({ page }) => {
  await page.goto("/");
  const urls = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
  const scripts = urls.filter((url) => /\.(?:m?js|ts)(?:\?|$)/.test(url) || url.includes("astro"));
  let beacon = false;
  let library = false;
  for (const url of scripts) {
    const response = await page.request.get(url);
    if (!response.ok()) continue;
    const body = await response.text();
    if (body.includes("/api/vitals")) beacon = true;
    if (body.includes("onLCP") || body.includes("web-vitals")) library = true;
    if (beacon && library) break;
  }
  expect(beacon).toBe(true);
  expect(library).toBe(true);
});
