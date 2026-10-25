import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const out = path.resolve("test-results/v13-cart");
const base = process.env.CART_BASE ?? "http://127.0.0.1:4321";

async function seed(page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "lahore_silicon_cart:ESP32-WROOM-32D",
      JSON.stringify({
        part_number: "ESP32-WROOM-32D",
        name: "Wi-Fi and Bluetooth module, 3.3 V",
        quantity: 9,
      }),
    );
  });
}

async function openCart(page) {
  await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("#cart-button[data-ready='true']").waitFor({ timeout: 30000 });
  const cart = page.getByRole("button", { name: /Cart \d+ parts?/ });
  await cart.click();
  const dialog = page.getByRole("dialog", { name: "Cart" });
  await dialog.waitFor({ state: "visible" });
  await page.waitForTimeout(800);
  return { cart, dialog };
}

async function shot(page, name) {
  const file = path.join(out, name);
  await page.screenshot({ path: file });
  return file;
}

const browser = await chromium.launch();
await mkdir(out, { recursive: true });
const notes = [];

const desktop = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: out, size: { width: 1440, height: 900 } },
});
const desk = await desktop.newPage();
await seed(desk);
const opened = await openCart(desk);
notes.push("checkout=" + (await opened.dialog.getByRole("link", { name: /Check out/ }).innerText()));
notes.push("companion=" + (await opened.dialog.getByRole("heading", { name: "You will also need" }).count()));
notes.push("part=" + (await opened.dialog.getByText("ESP32-WROOM-32D").count()));
notes.push("price=" + (await opened.dialog.getByText("Rs 11,250").count()));
await shot(desk, "cart-1440.png");
notes.push("overflow1440=" + (await desk.evaluate(() => document.documentElement.scrollWidth - 1440)));

const trapped = [];
for (let i = 0; i < 16; i += 1) {
  await desk.keyboard.press("Tab");
  trapped.push(await opened.dialog.evaluate((node) => node.contains(document.activeElement)));
}
notes.push("trap=" + trapped.every(Boolean));
await desk.keyboard.press("Escape");
await opened.dialog.waitFor({ state: "hidden", timeout: 5000 });
notes.push("escapeFocus=" + (await opened.cart.evaluate((node) => node === document.activeElement)));

await opened.cart.click();
await opened.dialog.waitFor({ state: "visible" });
await desk.waitForTimeout(600);
await shot(desk, "open-rest-1440.png");
const panel = desk.locator(".cart-sheet-panel");
const box = await panel.boundingBox();
if (box) {
  await desk.mouse.move(box.x + 48, box.y + 28);
  await desk.mouse.down();
  for (let i = 1; i <= 8; i += 1) {
    await desk.mouse.move(box.x + 48 + i * 50, box.y + 28);
    await desk.waitForTimeout(16);
    if (i === 4) await shot(desk, "drag-mid-1440.png");
  }
  await desk.mouse.up();
}
await desk.waitForTimeout(900);
await shot(desk, "drag-after-1440.png");
notes.push("dragHidden=" + (await opened.dialog.isHidden()));
await desktop.close();

const phone = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  recordVideo: { dir: out, size: { width: 390, height: 844 } },
});
const mob = await phone.newPage();
await seed(mob);
await openCart(mob);
await shot(mob, "cart-390.png");
notes.push("overflow390=" + (await mob.evaluate(() => document.documentElement.scrollWidth - 390)));
await mob.getByRole("button", { name: "Remove" }).click();
await mob.waitForTimeout(50);
await shot(mob, "remove-slide-390.png");
await mob.waitForTimeout(160);
await shot(mob, "remove-collapse-390.png");
await mob.waitForTimeout(280);
await shot(mob, "remove-gone-390.png");
await phone.close();

const reduced = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
  recordVideo: { dir: out, size: { width: 1440, height: 900 } },
});
const red = await reduced.newPage();
await seed(red);
await red.emulateMedia({ reducedMotion: "reduce" });
const redOpen = await openCart(red);
await shot(red, "reduced-open-1440.png");
const names = await red.evaluate(() =>
  [...document.getAnimations()].map((animation) => animation.animationName || "").filter(Boolean),
);
notes.push("reducedNames=" + names.join("|"));
await red.getByRole("button", { name: "Remove" }).click();
await red.waitForTimeout(100);
await shot(red, "reduced-remove-1440.png");
const panelBox = await red.locator(".cart-sheet-panel").boundingBox();
if (panelBox) {
  await red.mouse.move(panelBox.x + 40, panelBox.y + 24);
  await red.mouse.down();
  await red.mouse.move(panelBox.x + panelBox.width - 20, panelBox.y + 24, { steps: 6 });
  await shot(red, "reduced-drag-1440.png");
  await red.mouse.up();
}
await red.waitForTimeout(400);
await shot(red, "reduced-drag-after-1440.png");
await red.keyboard.press("Escape");
await redOpen.dialog.waitFor({ state: "hidden", timeout: 4000 }).catch(() => {});
notes.push("reducedHidden=" + (await redOpen.dialog.isHidden()));
await reduced.close();

await browser.close();
console.log(notes.join("\n"));
