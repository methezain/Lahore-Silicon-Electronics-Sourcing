import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = "http://127.0.0.1:4471";
const out = "tmp-r0-shots";
await mkdir(out, { recursive: true });

const report = {};
const browser = await chromium.launch();

async function newPage(width, height, scale, reduced) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(40_000);
  page.setDefaultNavigationTimeout(40_000);
  return { context, page };
}

async function edges(page) {
  return page.evaluate(() => {
    const row = [...document.querySelectorAll(".cat-table tbody tr")].find((node) =>
      node.textContent?.includes("LM7805"),
    );
    if (!row) return { error: "no row" };
    function contentLeft(cell) {
      const style = getComputedStyle(cell);
      return cell.getBoundingClientRect().left + Number.parseFloat(style.paddingLeft);
    }
    const headers = [...document.querySelectorAll(".cat-table th")];
    const stockHeader = headers.find((cell) => cell.textContent?.trim() === "Stock");
    const priceHeader = headers.find((cell) => cell.textContent?.trim() === "Price");
    const stock = row.querySelector(".stock-num");
    const priceCell = row.querySelector("td.price");
    const range = document.createRange();
    if (priceCell) range.selectNodeContents(priceCell);
    return {
      cursor: getComputedStyle(row).cursor,
      stockAlign: stockHeader ? getComputedStyle(stockHeader).textAlign : null,
      priceAlign: priceHeader ? getComputedStyle(priceHeader).textAlign : null,
      stockDelta: stockHeader && stock ? Math.abs(stock.getBoundingClientRect().left - contentLeft(stockHeader)) : null,
      priceDelta: priceHeader && priceCell ? Math.abs(range.getBoundingClientRect().left - contentLeft(priceHeader)) : null,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      widest: [...document.body.querySelectorAll("*")].reduce((best, el) => {
        const w = el.scrollWidth;
        return w > best.w ? { w, tag: el.tagName, cls: String(el.className).slice(0, 80) } : best;
      }, { w: 0, tag: "", cls: "" }),
    };
  });
}

async function catalog(width, height, scale, name) {
  console.log("step", name);
  const { context, page } = await newPage(width, height, scale, false);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  if (width < 900) {
    await page.locator("#catalog-view [data-view='list']").click();
  }
  await page.locator(".cat-table tbody tr", { hasText: "LM7805" }).waitFor();
  report[name] = await edges(page);
  await page.screenshot({ path: `${out}/${name}.png` });
  const link = page.locator(".cat-table tbody tr", { hasText: "LM7805" }).getByRole("link", { name: "LM7805" });
  await link.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  report[name].focusRing = await link.evaluate((el) => getComputedStyle(el, "::after").outlineStyle);
  await page.screenshot({ path: `${out}/${name}-focus.png` });
  await context.close();
}

async function product(width, height, scale, name) {
  console.log("step", name);
  const { context, page } = await newPage(width, height, scale, false);
  await page.goto(base + "/product/lm7805", { waitUntil: "domcontentloaded" });
  await page.locator(".crumb").waitFor();
  report[name] = await page.evaluate(() => {
    const header = document.querySelector(".site-header");
    const crumb = document.querySelector(".crumb");
    const bar = document.querySelector(".buy-bar");
    const barBox = bar?.getBoundingClientRect();
    const price = document.querySelector(".buy-bar .unit-price, .unit-price");
    const add = document.querySelector(".buy-bar .buy-add, .qty-row .buy-add");
    return {
      scrollY: window.scrollY,
      crumbGap: header && crumb ? crumb.getBoundingClientRect().top - header.getBoundingClientRect().bottom : null,
      buyBarDisplay: bar ? getComputedStyle(bar).display : null,
      buyBarClass: bar?.className ?? null,
      buyBarInView: barBox
        ? barBox.top >= 0 && barBox.bottom <= window.innerHeight + 1 && barBox.height > 0
        : false,
      price: price?.textContent?.trim() ?? null,
      add: add?.textContent?.trim() ?? null,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  await page.screenshot({ path: `${out}/${name}.png` });
  await context.close();
}

async function search(width, height, scale, name, query) {
  console.log("step", name);
  const { context, page } = await newPage(width, height, scale, false);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.locator("#search-open[data-ready='true']").waitFor();
  await page.locator("#search-open").click();
  const dialog = page.getByRole("dialog", { name: "Search parts" });
  await dialog.getByRole("combobox", { name: "Search parts" }).fill(query);
  const hit = dialog.locator(".search-hit").first();
  await hit.waitFor();
  await page.waitForTimeout(500);
  report[name] = await dialog.locator(".search-photo").first().evaluate((node) => {
    const img = node.querySelector("img");
    return {
      html: node.innerHTML.slice(0, 300),
      src: img?.getAttribute("src") ?? null,
      naturalWidth: img?.naturalWidth ?? 0,
    };
  });
  await page.screenshot({ path: `${out}/${name}.png` });
  await context.close();
}

async function cart(width, height, scale, name) {
  console.log("step", name);
  const { context, page } = await newPage(width, height, scale, false);
  await page.goto(base + "/product/lm7805", { waitUntil: "domcontentloaded" });
  const add = page.locator(".qty-row .buy-add");
  await add.waitFor();
  if (width < 900) {
    const bar = page.locator(".buy-bar .buy-add");
    if (await bar.isVisible()) await bar.click();
    else await add.click();
  } else {
    await add.click();
  }
  const sheet = page.getByRole("dialog", { name: "Cart" });
  await sheet.waitFor();
  const img = sheet.locator(".cart-photo img").first();
  await img.waitFor();
  await page.waitForTimeout(400);
  report[name] = await img.evaluate((node) => ({
    src: node.getAttribute("src"),
    naturalWidth: node.naturalWidth,
  }));
  await page.screenshot({ path: `${out}/${name}.png` });
  await context.close();
}

async function checkout(width, height, scale, name, withItem) {
  console.log("step", name);
  const { context, page } = await newPage(width, height, scale, false);
  page.setDefaultTimeout(90_000);
  page.setDefaultNavigationTimeout(90_000);
  if (withItem) {
    await page.addInitScript(() => {
      localStorage.setItem(
        "lahore_silicon_cart:LM7805",
        JSON.stringify({
          part_number: "LM7805",
          name: "5 V, 1 A, TO-220 linear regulator",
          quantity: 1,
        }),
      );
    });
  }
  await page.goto(base + "/checkout", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Checkout" }).waitFor();
  if (withItem) {
    await page.locator("#checkout-form").waitFor();
    const toggle = page.locator("#summary-toggle");
    if (await toggle.isVisible()) await toggle.click();
    await page.locator("#summary-items img").first().waitFor({ timeout: 20_000 }).catch(() => {});
  } else {
    await page.locator("#checkout-empty").waitFor();
  }
  report[name] = await page.evaluate(() => {
    const empty = document.querySelector("#checkout-empty");
    const form = document.querySelector("#checkout-form");
    const intro = document.querySelector("#checkout-intro");
    const img = document.querySelector("#summary-items img");
    return {
      emptyText: empty?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      emptyHidden: empty?.hidden ?? null,
      formHidden: form?.hidden ?? null,
      introHidden: intro?.hidden ?? null,
      total: document.querySelector("#summary-total")?.textContent?.trim() ?? null,
      merchandise: document.querySelector("#summary-merchandise")?.textContent?.trim() ?? null,
      thumb: img ? { src: img.getAttribute("src"), naturalWidth: img.naturalWidth } : null,
    };
  });
  await page.screenshot({ path: `${out}/${name}.png` });
  await context.close();
}

async function motion(reduced, name) {
  console.log("step", name);
  const { context, page } = await newPage(1440, 900, 1, reduced);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  const row = page.locator(".cat-table tbody tr", { hasText: "LM7805" });
  await row.waitFor();
  const sample = () =>
    row.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        transitionProperty: style.transitionProperty,
        transitionDuration: style.transitionDuration,
        background: style.backgroundColor,
        transform: style.transform,
      };
    });
  report[name] = { rest: await sample() };
  await page.screenshot({ path: `${out}/${name}-rest.png` });
  await row.hover();
  await page.waitForTimeout(40);
  report[name].mid = await sample();
  await page.screenshot({ path: `${out}/${name}-40.png` });
  await page.waitForTimeout(160);
  report[name].late = await sample();
  await page.screenshot({ path: `${out}/${name}-160.png` });
  await context.close();
}

const rest = process.argv.includes("--rest");
const steps = [
  ...(rest ? [] : [
    () => catalog(1440, 900, 1, "catalog-1440"),
    () => catalog(390, 844, 2, "catalog-390"),
    () => product(1440, 900, 1, "product-1440"),
  ]),
  () => product(390, 844, 2, "product-390"),
  () => search(1440, 900, 1, "search-1440", "lm 7805"),
  () => search(390, 844, 2, "search-390", "ESP32"),
  () => cart(1440, 900, 1, "cart-1440"),
  () => cart(390, 844, 2, "cart-390"),
  () => checkout(1440, 900, 1, "checkout-empty-1440", false),
  () => checkout(390, 844, 2, "checkout-empty-390", false),
  () => checkout(1440, 900, 1, "checkout-item-1440", true),
  () => checkout(390, 844, 2, "checkout-item-390", true),
  () => motion(false, "motion-on"),
  () => motion(true, "motion-reduce"),
];
for (const step of steps) {
  try {
    await step();
  } catch (error) {
    report.errors = report.errors ?? [];
    report.errors.push(String(error?.stack || error).split("\n").slice(0, 4).join("\n"));
  }
}
const { writeFileSync, readdirSync } = await import("node:fs");
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(readdirSync(out).join("\n"));
console.log(JSON.stringify(report, null, 2));
await browser.close();
