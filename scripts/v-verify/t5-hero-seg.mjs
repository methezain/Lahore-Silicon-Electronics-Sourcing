/** Segments the /home hero trace at 4x CPU: arrival, idle, pointer, scroll. */
import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://127.0.0.1:4322";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.__seg = "arrival"; window.__f = {}; let last = 0;
  const tick = (t) => { if (last) (window.__f[window.__seg] ||= []).push(t - last); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await page.goto(`${base}/home`, { waitUntil: "load" });
await sleep(2500);
await page.evaluate(() => (window.__seg = "idle")); await sleep(1500);
await page.evaluate(() => (window.__seg = "pointer"));
for (let i = 0; i < 40; i += 1) { await page.mouse.move(300 + i * 20, 300 + (i % 5) * 20); await sleep(25); }
await page.evaluate(() => (window.__seg = "scroll"));
for (let i = 0; i < 10; i += 1) { await page.mouse.wheel(0, 120); await sleep(60); }
await sleep(400);
const f = await page.evaluate(() => window.__f);
for (const [k, v] of Object.entries(f)) { const s = v.reduce((a, b) => a + b, 0); console.log(k, "frames", v.length, "fps", (v.length / s * 1000).toFixed(1), "over20", v.filter((x) => x > 20).length, "max", Math.max(...v).toFixed(0)); }
await browser.close();
