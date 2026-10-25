/** T5 perf proof: 4x CPU throttle, rAF frame intervals + event timing (INP proxy) + Chrome trace per scenario. */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.BASE ?? "http://127.0.0.1:4325";
const out = "docs/reports/t5";
await mkdir(out, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PROBE = () => {
  window.__frames = [];
  window.__events = [];
  let last = 0;
  try { window.__rec = localStorage.getItem("t5rec") === "1"; } catch { window.__rec = false; }
  const tick = (t) => {
    if (window.__rec && last) window.__frames.push(t - last);
    last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (e.interactionId) window.__events.push({ type: e.name, duration: e.duration });
  }).observe({ type: "event", durationThreshold: 16, buffered: true });
};

function summarize(frames) {
  const sorted = [...frames].sort((a, b) => a - b);
  const sum = frames.reduce((a, b) => a + b, 0);
  const p = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
  const dropped = frames.filter((f) => f > 20).length;
  return {
    frames: frames.length,
    avgFps: Math.round((frames.length / sum) * 1000 * 10) / 10,
    p95Ms: Math.round(p(0.95) * 10) / 10,
    maxMs: Math.round((sorted.at(-1) ?? 0) * 10) / 10,
    over20ms: dropped,
    pctOver20: Math.round((dropped / Math.max(1, frames.length)) * 1000) / 10,
  };
}

const browser = await chromium.launch();
const results = [];

async function scenario(name, vp, setup, act) {
  const mobile = vp === 390;
  const ctx = await browser.newContext(
    mobile
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { viewport: { width: 1440, height: 900 } },
  );
  const page = await ctx.newPage();
  await page.addInitScript(PROBE);
  if (name === "product-arrival" || name === "home-hero") await page.addInitScript(() => { try { localStorage.setItem("t5rec", "1"); } catch {} });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await setup(page);
  const traceFile = `${out}/${name}-${vp}.trace.json`;
  await browser.startTracing(page, { path: traceFile, categories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "blink.user_timing"] });
  await page.evaluate(() => { window.__frames = []; window.__events = []; window.__rec = true; });
  await act(page, mobile);
  await sleep(600);
  const data = await page.evaluate(() => { window.__rec = false; return { frames: window.__frames, events: window.__events }; });
  await browser.stopTracing();
  const s = summarize(data.frames);
  const worst = data.events.reduce((m, e) => Math.max(m, e.duration), 0);
  const row = { scenario: name, viewport: vp, ...s, slowestInteractionMs: Math.round(worst), interactions: data.events.length };
  results.push(row);
  console.log(JSON.stringify(row));
  await ctx.close();
}

const seedCart = (page) =>
  page.addInitScript(() => {
    localStorage.setItem("lahore_silicon_cart:LM7805", JSON.stringify({ part_number: "LM7805", name: "5 V, 1 A, TO-220 linear regulator", quantity: 1 }));
    localStorage.setItem("lahore_silicon_cart:ESP32-WROOM-32D", JSON.stringify({ part_number: "ESP32-WROOM-32D", name: "Wi-Fi and Bluetooth module, 3.3 V", quantity: 2 }));
  });

for (const vp of [390, 1440]) {
  await scenario("catalog-filter", vp, async (page) => {
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
    await page.locator("#catalog-q").scrollIntoViewIfNeeded();
  }, async (page) => {
    const q = page.locator("#catalog-q");
    await q.click();
    await page.keyboard.type("esp", { delay: 120 });
    await sleep(500);
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await sleep(500);
    await page.keyboard.type("lm", { delay: 120 });
  });

  await scenario("cart-sheet", vp, async (page) => {
    await seedCart(page);
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
    await page.locator("#cart-button[data-ready='true']").waitFor({ timeout: 15000 });
  }, async (page, mobile) => {
    await page.locator("#cart-button").click();
    await sleep(900);
    const head = await page.locator(".cart-heading").boundingBox();
    const x = head.x + 20;
    const y = head.y + head.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i += 1) {
      await page.mouse.move(x + i * 8, y);
      await sleep(30);
    }
    await page.mouse.up();
    await sleep(500);
    await page.locator("#cart-button").click().catch(() => {});
    await sleep(900);
    await page.keyboard.press("Escape");
  });

  await scenario("product-arrival", vp, async (page) => {
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
  }, async (page) => {
    const link = page.locator('a[href^="/product/lm7805"]:visible').first();
    await link.click();
    await page.waitForURL(/\/product\/lm7805/);
    await page.waitForLoadState("networkidle");
  });

  await scenario("home-hero", vp, async (page) => {
    await page.goto(`${base}/about`, { waitUntil: "load" });
  }, async (page, mobile) => {
    await page.goto(`${base}/home`, { waitUntil: "load" });
    await sleep(2500);
    if (!mobile) {
      await page.mouse.move(300, 300);
      for (let i = 0; i < 30; i += 1) {
        await page.mouse.move(300 + i * 25, 300 + (i % 5) * 20);
        await sleep(25);
      }
    }
    await page.mouse.wheel(0, 600);
    await sleep(600);
  });
}

await browser.close();
await writeFile(`${out}/t5-trace-summary.json`, JSON.stringify({ base, cpuThrottle: 4, method: "rAF frame intervals; frame >20ms counted as dropped; INP proxy = slowest event-timing interaction", results }, null, 2));
