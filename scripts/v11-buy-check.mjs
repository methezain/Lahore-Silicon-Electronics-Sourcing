import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.env.V11_BASE ?? "http://127.0.0.1:4322";
const out = "v11-shots";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

function log(message) {
  console.log(message);
}

async function openPart(context, path) {
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on("pageerror", (error) => log(`pageerror ${error.message}`));
  const response = await page.goto(`${base}${path}`, { waitUntil: "commit", timeout: 90000 });
  log(`goto ${path} ${response?.status()}`);
  await page.locator(".qty-presets").waitFor({ state: "visible" });
  return page;
}

async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function panel(width, reduced) {
  const size = width === 390 ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: width === 390 ? 2 : 1,
    reducedMotion: reduced ? "reduce" : "no-preference",
    recordVideo: { dir: `${out}/video-${width}-${reduced ? "reduce" : "motion"}`, size },
  });
  const page = await openPart(context, "/product/lm7805");
  const tag = `${width}-${reduced ? "reduce" : "motion"}`;
  await page.screenshot({ path: `${out}/${tag}-top.png` });
  log(`${tag} overflow ${await overflow(page)}`);
  await page.locator(".buy-panel").screenshot({ path: `${out}/${tag}-panel.png` });
  log(`${tag} presets ${(await page.locator(".qty-preset").allTextContents()).join(",")}`);
  await page.getByRole("button", { name: "Set quantity to 10" }).click();
  const add = page.locator(".qty-row .buy-add");
  log(`${tag} qty10 ${JSON.stringify(await add.textContent())}`);
  await page.locator(".qty-row").screenshot({ path: `${out}/${tag}-qty10.png` });

  const box = await add.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 12, box.y + box.height / 2);
    await page.mouse.down();
    log(`${tag} press ${await add.evaluate((el) => getComputedStyle(el).transform)}`);
    await page.mouse.up();
  }
  await page.waitForTimeout(80);
  await page.screenshot({ path: `${out}/${tag}-t80.png` });
  await page.waitForTimeout(180);
  await page.screenshot({ path: `${out}/${tag}-t260.png` });
  await page.waitForTimeout(280);
  await page.screenshot({ path: `${out}/${tag}-t540.png` });
  const cart = page.getByRole("dialog", { name: "Cart" });
  const open = await cart.isVisible().catch(() => false);
  log(`${tag} cart ${open} label ${JSON.stringify(await add.textContent())} count ${JSON.stringify(await page.locator("#cart-button").textContent())}`);
  if (open) {
    log(`${tag} line ${await page.getByText("Added LM7805 to cart").isVisible()}`);
    await cart.screenshot({ path: `${out}/${tag}-cart.png` });
  }
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${out}/${tag}-rest.png` });
  log(`${tag} rest ${JSON.stringify(await add.textContent())} plug ${await page.locator(".cart-plug").getAttribute("class")}`);
  await context.close();
}

async function edges() {
  const narrow = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await openPart(narrow, "/product/lm7805");
  log(`bar ${await page.locator(".buy-bar:not(.is-off)").isVisible()} ${JSON.stringify(await page.locator(".buy-bar .buy-add").textContent())}`);
  await page.locator(".buy-bar .buy-add").click();
  await page.getByRole("dialog", { name: "Cart" }).waitFor();
  log(`bar cart count ${JSON.stringify(await page.locator("#cart-button").textContent())}`);
  await page.screenshot({ path: `${out}/390-bar-cart.png` });
  await narrow.close();

  const esp = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const espPage = await openPart(esp, "/product/esp32-wroom-32d");
  log(`esp presets ${(await espPage.locator(".qty-preset").allTextContents()).join(",")}`);
  const qty = espPage.getByRole("textbox", { name: "Quantity for ESP32-WROOM-32D" });
  await qty.fill("9");
  await qty.blur();
  log(`esp ${JSON.stringify(await espPage.locator(".qty-row .buy-add").textContent())} overflow ${await overflow(espPage)}`);
  await espPage.locator(".buy-panel").screenshot({ path: `${out}/390-esp32.png` });
  await esp.close();

  const keys = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const keyPage = await openPart(keys, "/product/lm7805");
  await keyPage.getByRole("button", { name: "Set quantity to 1" }).focus();
  const order = [];
  for (let i = 0; i < 7; i++) {
    order.push(await keyPage.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return "";
      return `${el.getAttribute("aria-label") || el.innerText?.replace(/\s+/g, " ").trim()} outline:${getComputedStyle(el).outlineStyle}`;
    }));
    await keyPage.keyboard.press("Tab");
  }
  log(`keyboard ${order.join(" | ")}`);
  const noteQty = keyPage.getByRole("textbox", { name: "Quantity for LM7805" });
  await noteQty.fill("999");
  await noteQty.blur();
  log(`note ${JSON.stringify(await keyPage.locator("#qty-note-LM7805").textContent())} ${JSON.stringify(await keyPage.locator(".qty-row .buy-add").textContent())}`);
  await keys.close();

  for (const reduced of [false, true]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile",
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    await context.addInitScript(() => {
      navigator.vibrate = (duration) => {
        (window.__vib ??= []).push(duration);
        return true;
      };
    });
    const hapticPage = await openPart(context, "/product/lm7805");
    await hapticPage.locator(".qty-row .buy-add").click();
    await hapticPage.waitForTimeout(500);
    log(`haptic reduced=${reduced} ${JSON.stringify(await hapticPage.evaluate(() => window.__vib ?? []))}`);
    await context.close();
  }
}

try {
  await panel(1440, false);
  await panel(1440, true);
  await panel(390, false);
  await panel(390, true);
  await edges();
} catch (error) {
  log(`FAIL ${error instanceof Error ? error.stack : error}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
