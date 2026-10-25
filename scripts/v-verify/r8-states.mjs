/** R8 states: meta tags, offline banner, toast, copy morph, print receipt, state pages. */
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://localhost:4321";
const order = process.env.ORDER ?? "LHR-db9240bb016a3adb";
const out = "logs/agent";
const browser = await chromium.launch();
const log = (...a) => console.log(...a);

const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

await page.goto(`${base}/product/lm7805`);
log("theme-color", await page.getAttribute('meta[name="theme-color"]', "content"));
log("og:image", await page.getAttribute('meta[property="og:image"]', "content"));
log("apple-touch-icon", await page.getAttribute('link[rel="apple-touch-icon"]', "href"));
for (const url of ["/og/lm7805.png", "/og/default.png", "/favicon.ico", "/favicon.svg", "/apple-touch-icon.png", "/site.webmanifest"]) {
  const res = await page.request.get(base + url);
  log(url, res.status(), res.headers()["content-type"]);
}
const computed = await page.evaluate(() => {
  const root = getComputedStyle(document.documentElement);
  return { accent: root.accentColor, scrollbar: root.scrollbarColor };
});
log("root", computed);

await context.setOffline(true);
await page.evaluate(() => window.dispatchEvent(new Event("offline")));
await page.waitForTimeout(400);
log("offline banner visible", await page.isVisible("#offline-banner"));
await page.screenshot({ path: `${out}/r8-offline-390.png` });
await context.setOffline(false);
await page.evaluate(() => window.dispatchEvent(new Event("online")));
await page.waitForTimeout(400);
log("offline banner hidden after online", !(await page.isVisible("#offline-banner")));
log("toast text", await page.textContent("#toast-status"));
await page.screenshot({ path: `${out}/r8-toast-390.png` });

await page.goto(`${base}/shipping-and-payments`);
const btn = page.locator(".copy-btn").first();
if (await btn.count()) {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
  await btn.click();
  await page.waitForTimeout(350);
  log("copy state", await btn.getAttribute("data-state"), await btn.textContent());
  await page.screenshot({ path: `${out}/r8-copy-390.png`, clip: { x: 0, y: 0, width: 390, height: 844 } });
} else {
  log("shipping page has no copy buttons (no payment config)");
}

for (const [path, shot] of [["/nope-missing", "404"], [`/order-success/${order}`, "receipt"], ["/checkout", "checkout-empty"]]) {
  await page.goto(base + path);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/r8-state-${shot}-390.png` });
}

const wide = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await wide.goto(`${base}/order-success/${order}`);
await wide.waitForTimeout(1200);
await wide.emulateMedia({ media: "print" });
await wide.pdf({ path: `${out}/r8-receipt-print.pdf`, format: "A4", printBackground: true });
const hidden = await wide.evaluate(() => ({
  header: getComputedStyle(document.querySelector(".site-header")).display,
  footer: getComputedStyle(document.querySelector(".site-footer")).display,
  bay: getComputedStyle(document.querySelector(".connect-bay")).display,
  receipt: getComputedStyle(document.querySelector(".receipt-sheet")).display,
}));
log("print display", hidden);
await browser.close();
