/** R8 craft audit: overflow, tiny uppercase labels, widows, off-grid spacing, console errors. */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.BASE ?? "http://localhost:4321";
const pages = ["/", "/home", "/product/lm7805", "/product/esp32-wroom-32d", "/checkout", "/shipping-and-payments", "/about", "/contact", "/quick-order", "/nope-missing", "/order-success/missing"];
const widths = [390, 900, 1440];
const shots = process.env.SHOTS === "1";

function inPage() {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
  };
  const label = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const cls = typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };
  const out = { overflow: document.documentElement.scrollWidth - innerWidth, tinyUpper: [], widows: [], offGrid: {} };

  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el) || el.closest("[hidden], svg")) continue;
    const cs = getComputedStyle(el);
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ").trim();
    if (own && cs.textTransform === "uppercase" && parseFloat(cs.fontSize) <= 12.5) {
      const words = own.split(/\s+/).filter(Boolean).length;
      if (words > 2) out.tinyUpper.push(`${label(el)}: "${own.slice(0, 60)}" (${words} words)`);
    }
    if (/^(P|LI|H1|H2|H3|H4|DD|DT|FIGCAPTION|SPAN|A|LABEL)$/.test(el.tagName) && own.split(/\s+/).length >= 4 && ![...el.children].some((c) => getComputedStyle(c).display.startsWith("block"))) {
      const text = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim().split(/\s+/).length >= 4);
      if (text) {
        const range = document.createRange();
        range.selectNodeContents(text);
        const rects = [...range.getClientRects()].filter((r) => r.width > 1);
        const lines = [...new Set(rects.map((r) => Math.round(r.top)))];
        if (lines.length >= 2) {
          const content = text.textContent.trimEnd();
          const lastSpace = Math.max(content.lastIndexOf(" "), content.lastIndexOf(" "));
          const r2 = document.createRange();
          r2.setStart(text, lastSpace + 1);
          r2.setEnd(text, content.length);
          const lastRects = [...r2.getClientRects()];
          const r3 = document.createRange();
          r3.setStart(text, 0);
          r3.setEnd(text, lastSpace);
          const before = [...r3.getClientRects()].filter((r) => r.width > 1);
          const lastTop = lastRects.length ? Math.round(lastRects[lastRects.length - 1].top) : 0;
          const prevTop = before.length ? Math.round(before[before.length - 1].top) : 0;
          if (lastTop > prevTop + 4) out.widows.push(`${label(el)}: "…${content.slice(-30)}"`);
        }
      }
    }
    for (const prop of ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "marginTop", "marginBottom", "rowGap", "columnGap"]) {
      const value = parseFloat(cs[prop]);
      if (!Number.isFinite(value) || value === 0) continue;
      if (Math.abs(value - Math.round(value / 4) * 4) > 0.51 && value !== 2) {
        const key = `${label(el)} ${prop}`;
        out.offGrid[key] = value;
      }
    }
  }
  return out;
}

await mkdir("logs/agent", { recursive: true });
const browser = await chromium.launch();
const report = {};
for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  for (const path of pages) {
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    const response = await page.goto(base + path, { waitUntil: "load" });
    await page.waitForTimeout(500);
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(inPage);
    report[`${width} ${path}`] = { status: response?.status(), errors, ...result };
    if (shots) await page.screenshot({ path: `logs/agent/r8-${width}${path.replace(/\W+/g, "_")}.png`, fullPage: true });
    await page.close();
  }
  await context.close();
}
await browser.close();
await writeFile("logs/agent/2026-10-22-r8-audit.json", JSON.stringify(report, null, 2));
for (const [key, r] of Object.entries(report)) {
  console.log(`${key} [${r.status}] overflow=${r.overflow} tinyUpper=${r.tinyUpper.length} widows=${r.widows.length} offGrid=${Object.keys(r.offGrid).length} errors=${r.errors.length}`);
}
