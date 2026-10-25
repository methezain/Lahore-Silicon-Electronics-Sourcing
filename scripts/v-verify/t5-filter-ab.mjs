/** A/B: typing in the catalog filter at 4x CPU, with and without view transitions. */
import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://127.0.0.1:4322";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
for (const vt of [true, false]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  if (!vt) await page.addInitScript(() => { document.startViewTransition = undefined; });
  await page.addInitScript(() => {
    window.__ev = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.interactionId) window.__ev.push(e.duration); }).observe({ type: "event", durationThreshold: 16 });
  });
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.locator("#catalog-q").click();
  await page.keyboard.type("esp", { delay: 150 });
  await sleep(600);
  await page.keyboard.press("Control+A"); await page.keyboard.press("Backspace");
  await sleep(600);
  const ev = await page.evaluate(() => window.__ev);
  console.log(JSON.stringify({ viewTransitions: vt, rows: await page.locator("[data-part]").count(), slowest: Math.round(Math.max(...ev)), all: ev.map(Math.round) }));
  await ctx.close();
}
await browser.close();
