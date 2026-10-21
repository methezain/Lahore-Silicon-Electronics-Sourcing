import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const out = path.resolve("photo-qa");
await mkdir(out, { recursive: true });

const parts = [
  "lm7805",
  "ds18b20",
  "esp32",
  "ne555",
  "hc-sr04",
  "ams1117",
  "arduino-nano",
  "lm2596",
  "tcrt5000",
  "srd-05vdc",
];
for (const name of parts) {
  const before = await sharp(`src/assets/parts/${name}.jpg`).resize(512, 512).jpeg({ quality: 75 }).toBuffer();
  const after = await sharp(`src/assets/parts/cutouts/${name}.webp`)
    .resize(512, 512)
    .png()
    .toBuffer();
  const stage = await sharp({
    create: { width: 512, height: 512, channels: 3, background: { r: 243, g: 246, b: 250 } },
  })
    .composite([{ input: after }])
    .jpeg({ quality: 75 })
    .toBuffer();
  await sharp({
    create: { width: 1024, height: 512, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([
      { input: before, left: 0, top: 0 },
      { input: stage, left: 512, top: 0 },
    ])
    .jpeg({ quality: 78 })
    .toFile(path.join(out, `pair-${name}.jpg`));
}

const pages = [
  ["catalog", "http://localhost:4321/"],
  ["product-lm7805", "http://localhost:4321/product/lm7805"],
  ["home", "http://localhost:4321/home"],
];
const viewports = [
  ["390", 390, 844, 2],
  ["1440", 1440, 900, 1],
];

async function settle(page) {
  await page.locator("h1").first().waitFor({ state: "visible", timeout: 45000 });
  await page
    .waitForFunction(() => [...document.images].some((img) => img.complete && img.naturalWidth > 8), { timeout: 45000 })
    .catch(() => undefined);
  await page.waitForTimeout(400);
}

const browser = await chromium.launch();
try {
  for (const [label, url] of pages) {
    for (const [name, width, height, deviceScaleFactor] of viewports) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor });
      try {
        await page.goto(url, { waitUntil: "commit", timeout: 45000 });
        await settle(page);
        const overflow = name === "390"
          ? await page.evaluate(() => document.documentElement.scrollWidth)
          : null;
        await page.screenshot({ path: path.join(out, `after-${label}-${name}.png`), animations: "disabled" });
        const photo = page.locator(".photo-stage").first();
        if (await photo.count()) await photo.screenshot({ path: path.join(out, `after-${label}-${name}-stage.png`) });
        console.log(`saved after-${label}-${name}`, overflow ?? "");
      } catch (error) {
        console.error(`failed after-${label}-${name}`, error.message);
      }
      await page.close();
    }
  }

  const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await reduced.emulateMedia({ reducedMotion: "reduce" });
  await reduced.goto("http://localhost:4321/product/lm7805", { waitUntil: "commit", timeout: 45000 });
  await settle(reduced);
  await reduced.screenshot({ path: path.join(out, "after-lm7805-1440-reduced.png"), animations: "disabled" });
  const opener = reduced.locator(".gallery-open").first();
  if (await opener.count()) {
    await opener.focus();
    await reduced.screenshot({ path: path.join(out, "after-lm7805-1440-focus.png") });
    console.log("focus ring captured");
  }
  await reduced.close();
} finally {
  await browser.close();
}
