import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.env.V12_BASE ?? "http://127.0.0.1:4408";
const out = "v12-shots";
mkdirSync(`${out}/motion`, { recursive: true });

const browser = await chromium.launch();

async function open(width, height, scale) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    hasTouch: width < 500,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return { context, page, errors };
}

async function settle(page, url) {
  await page.goto(`${base}${url}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.locator(".section-nav").waitFor({ timeout: 30000 });
  await page.addStyleTag({ content: "astro-dev-toolbar{display:none !important}" });
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
  });
  await page.waitForTimeout(400);
}

async function place(page, selector) {
  await page.locator(selector).evaluate((el) => {
    el.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await page.waitForTimeout(50);
  return page.locator(selector).evaluate((el) => ({
    top: Math.round(el.getBoundingClientRect().top),
    navBottom: Math.round(document.querySelector(".section-nav")?.getBoundingClientRect().bottom ?? 0),
    current: document.querySelector(".section-nav a[aria-current='true']")?.textContent ?? "",
  }));
}

const desk = await open(1440, 900, 1);
await settle(desk.page, "/product/esp32-wroom-32d");
console.log("specs", JSON.stringify(await place(desk.page, "#specs")));
await desk.page.screenshot({ path: `${out}/esp32-1440-specs.png` });
console.log("pin", JSON.stringify(await place(desk.page, "#pinout")));
await desk.page.locator(".pin-stage").evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
await desk.page.locator("#pinout .pin-row").nth(3).hover();
await desk.page.waitForTimeout(200);
await desk.page.screenshot({ path: `${out}/esp32-1440-pinout.png` });

const island = desk.page.locator("astro-island", { has: desk.page.locator(".catalog-add") });
console.log("islands", await island.count());
await desk.page.waitForFunction(() => {
  const button = [...document.querySelectorAll("button")].find((el) => el.getAttribute("aria-label") === "Add AMS1117-3.3 to cart");
  const host = button?.closest("astro-island");
  return button && host && !host.hasAttribute("ssr");
}, { timeout: 15000 }).catch((err) => console.log("hydrate", err.message));
const add = desk.page.getByRole("button", { name: "Add AMS1117-3.3 to cart" });
await add.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
console.log("ssr", await add.evaluate((el) => el.closest("astro-island")?.hasAttribute("ssr")));
await add.click();
await desk.page.waitForTimeout(500);
const dialogs = desk.page.getByRole("dialog");
console.log("dialogs", await dialogs.count());
if (await dialogs.count()) console.log("dialog", (await dialogs.first().innerText()).slice(0, 240));
console.log("pageerrors", desk.errors);
await desk.page.screenshot({ path: `${out}/esp32-1440-added.png` });

const phone = await open(390, 844, 2);
await settle(phone.page, "/product/esp32-wroom-32d");
console.log("m-specs", JSON.stringify(await place(phone.page, "#specs")));
await phone.page.screenshot({ path: `${out}/esp32-390-specs.png` });
await phone.page.locator(".pin-stage").evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
await phone.page.locator("#pinout .pin-row").nth(1).tap();
await phone.page.waitForTimeout(200);
await phone.page.screenshot({ path: `${out}/esp32-390-pinout.png` });

const lm = await open(1440, 900, 1);
await settle(lm.page, "/product/lm7805");
await lm.page.locator(".pin-stage").evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
await lm.page.locator("#pinout .pin-row").first().hover();
await lm.page.waitForTimeout(200);
await lm.page.screenshot({ path: `${out}/lm7805-1440-pinout.png` });
console.log("colors", JSON.stringify(await lm.page.locator(".spec-panel").evaluate((root) => ({
  unit: getComputedStyle(root.querySelector(".unit")).color,
  value: getComputedStyle(root.querySelector("dd")).color,
}))));

const lmPhone = await open(390, 844, 2);
await settle(lmPhone.page, "/product/lm7805");
await lmPhone.page.locator(".pin-stage").evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
await lmPhone.page.locator("#pinout .pin-row").nth(2).hover();
await lmPhone.page.waitForTimeout(200);
await lmPhone.page.screenshot({ path: `${out}/lm7805-390-pinout.png` });

const hc = await open(1440, 900, 1);
await settle(hc.page, "/product/hc-sr04");
console.log("hc", JSON.stringify(await place(hc.page, "#pinout")));
await hc.page.waitForTimeout(300);
await hc.page.screenshot({ path: `${out}/hc-1440-companions.png` });

const hcPhone = await open(390, 844, 2);
await settle(hcPhone.page, "/product/hc-sr04");
await hcPhone.page.getByRole("heading", { name: "You will also need" }).evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
await hcPhone.page.waitForTimeout(600);
await hcPhone.page.screenshot({ path: `${out}/hc-390-companions.png` });

for (const reduced of [false, true]) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: reduced ? "reduce" : "no-preference",
    recordVideo: { dir: `${out}/motion`, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  await settle(page, "/product/lm7805");
  const summary = page.locator("#questions summary").first();
  await summary.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  const before = await page.locator("#questions .faq-panel").first().evaluate((el) => getComputedStyle(el).gridTemplateRows);
  await summary.click();
  await page.waitForTimeout(reduced ? 30 : 100);
  const during = await page.locator("#questions .faq-panel").first().evaluate((el) => ({
    rows: getComputedStyle(el).gridTemplateRows,
    transition: getComputedStyle(el).transitionProperty,
    open: el.closest("details")?.classList.contains("is-open") ?? false,
  }));
  await page.screenshot({ path: `${out}/faq-${reduced ? "reduced" : "motion"}.png` });
  console.log("faq", reduced, before, JSON.stringify(during));
  await page.waitForTimeout(reduced ? 40 : 250);
  const video = page.video();
  await context.close();
  console.log("video", reduced, video ? await video.path() : "");
}

await browser.close();
