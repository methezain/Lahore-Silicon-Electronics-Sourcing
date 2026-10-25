import { mkdir, writeFile } from "node:fs/promises";
import { chromium, firefox } from "@playwright/test";

const out = ".v4-nav/shots";
const base = "http://localhost:4323";
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" }).catch(async (error) => {
  console.log("chrome channel failed", String(error).split("\n")[0]);
  return chromium.launch();
});

async function condensed(width, height, scale, name) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale });
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 220);
  });
  await page.waitForFunction(() => document.querySelector(".site-header")?.classList.contains("is-condensed"));
  await page.waitForTimeout(350);
  const bar = await page.locator(".site-bar").evaluate((el) => ({
    height: getComputedStyle(el).height,
    shadow: getComputedStyle(el).boxShadow,
  }));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.screenshot({ path: `${out}/${name}.png` });
  await context.close();
  return { name, bar, overflow };
}

const sizes = [];
sizes.push(await condensed(390, 844, 2, "header-condensed-390"));
sizes.push(await condensed(1440, 900, 1, "header-condensed-1440"));

async function record(width, height, reduced, label) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: width < 500 ? 2 : 1,
    reducedMotion: reduced ? "reduce" : "no-preference",
    recordVideo: { dir: out, size: { width, height } },
  });
  const page = await context.newPage();
  const frames = [];
  let client;
  try {
    client = await context.newCDPSession(page);
    client.on("Page.screencastFrame", async (frame) => {
      if (frames.length < 24) frames.push(Buffer.from(frame.data, "base64"));
      await client.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => {});
    });
    await client.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
  } catch (error) {
    console.log("screencast unavailable", String(error).split("\n")[0]);
  }
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  const link = page.locator('a[href="/product/lm7805"]:visible').first();
  await link.scrollIntoViewIfNeeded();
  const swapPromise = page.evaluate(() => new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ event: false }), 5000);
    document.addEventListener("pageswap", (event) => {
      clearTimeout(timer);
      resolve({ event: true, viewTransition: Boolean(event.viewTransition) });
    }, { once: true });
  }));
  await Promise.all([page.waitForURL(/\/product\/lm7805/), link.click()]);
  const swap = await swapPromise;
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${label}-product.png` });
  await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(600);
  if (client) await client.send("Page.stopScreencast").catch(() => {});
  const video = page.video();
  await context.close();
  const videoPath = video ? await video.path() : "";
  const picks = [0, Math.floor(frames.length / 2), Math.max(0, frames.length - 1)];
  const saved = [];
  for (const index of [...new Set(picks)]) {
    if (!frames[index]) continue;
    const file = `${out}/${label}-frame-${index}.png`;
    await writeFile(file, frames[index]);
    saved.push(file);
  }
  return { label, frames: frames.length, saved, videoPath, swap };
}

const motion = [];
motion.push(await record(1440, 900, false, "motion-1440"));
motion.push(await record(390, 844, false, "motion-390"));
motion.push(await record(1440, 900, true, "reduced-1440"));
motion.push(await record(390, 844, true, "reduced-390"));

let firefoxResult = { installed: false };
try {
  const fox = await firefox.launch();
  const context = await fox.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  const swapPromise = page.evaluate(() => new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ event: false }), 5000);
    document.addEventListener("pageswap", (event) => {
      clearTimeout(timer);
      resolve({ event: true, viewTransition: Boolean(event.viewTransition) });
    }, { once: true });
  }));
  await Promise.all([
    page.waitForURL(/\/product\/lm7805/),
    page.locator('a[href="/product/lm7805"]:visible').first().click(),
  ]);
  const swap = await swapPromise;
  firefoxResult = {
    installed: true,
    swap,
    rules: await page.locator('script[type="speculationrules"]').count(),
    url: page.url(),
  };
  await context.close();
  await fox.close();
} catch (error) {
  firefoxResult = { installed: false, error: String(error).split("\n")[0] };
}

await browser.close();
const report = { sizes, motion, firefoxResult };
await writeFile(".v4-nav/report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
