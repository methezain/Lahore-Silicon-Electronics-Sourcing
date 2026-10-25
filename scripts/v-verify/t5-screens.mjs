/** Regenerates docs/design/screens/ from the running site (and the specimen for tokens). */
import { chromium } from "@playwright/test";
import { mkdir, readdir, rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const base = process.env.BASE ?? "http://localhost:4321";
const out = "docs/design/screens";
await mkdir(out, { recursive: true });
for (const f of await readdir(out)) if (f.endsWith(".png")) await rm(`${out}/${f}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const step = Math.max(innerHeight, 1);
    const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    scrollTo(0, 0);
    await Promise.all([...document.images].map((i) => new Promise((r) => { if (i.complete) r(); else { i.onload = i.onerror = () => r(); setTimeout(r, 4000); } })));
  });
  await sleep(1200);
}

const browser = await chromium.launch();
for (const [prefix, vp] of [["mobile", 390], ["desktop", 1440]]) {
  const opts = vp === 390
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 } };
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(() => {
    localStorage.setItem("lahore_silicon_cart:LM7805", JSON.stringify({ part_number: "LM7805", name: "5 V, 1 A, TO-220 linear regulator", quantity: 1 }));
    localStorage.setItem("lahore_silicon_cart:ESP32-WROOM-32D", JSON.stringify({ part_number: "ESP32-WROOM-32D", name: "Wi-Fi and Bluetooth module, 3.3 V", quantity: 2 }));
  });
  const page = await ctx.newPage();
  const shot = (name, target) => (target ? target.screenshot({ path: `${out}/${prefix}-${name}.png` }) : page.screenshot({ path: `${out}/${prefix}-${name}.png` }));

  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await settle(page);
  await shot("first-screen");
  await shot("catalog", page.locator("#catalog"));
  await shot("footer", page.locator("footer.site-footer"));
  await page.locator("#cart-button[data-ready='true']").waitFor({ timeout: 15000 });
  await page.locator("#cart-button").click();
  await sleep(1200);
  await shot("drawer");
  await page.keyboard.press("Escape");

  await page.goto(`${base}/home`, { waitUntil: "networkidle" });
  await settle(page);
  await shot("hero");
  await shot("bento", page.locator(".bento-section"));
  await shot("band", page.locator("#ordering"));

  await page.goto(`${base}/product/lm7805`, { waitUntil: "networkidle" });
  await settle(page);
  await shot("pdp");
  await ctx.close();
}

const spec = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const sp = await spec.newPage();
await sp.goto(pathToFileURL(resolve("docs/design/specimen.html")).href, { waitUntil: "load" });
await sp.evaluate(() => document.fonts.ready);
await sp.locator("#s-tokens").screenshot({ path: `${out}/desktop-tokens.png` });
await sp.setViewportSize({ width: 390, height: 844 });
await sleep(300);
await sp.locator("#s-tokens").screenshot({ path: `${out}/mobile-tokens.png` });
await browser.close();
