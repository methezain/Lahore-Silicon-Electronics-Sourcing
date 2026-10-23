/** T5 audit: reduced motion (running animations) and reduced transparency (backdrop-filter) on every page. */
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const base = process.env.BASE ?? "http://localhost:4321";
const pages = ["/", "/home", "/product/lm7805", "/product/esp32-wroom-32d", "/checkout", "/shipping-and-payments", "/about", "/contact", "/quick-order", "/nope-missing", "/order-success/missing"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const rows = [];

function inPage() {
  const running = document.getAnimations()
    .filter((a) => a.playState === "running")
    .map((a) => {
      const t = a.effect?.getComputedTiming?.();
      const target = a.effect?.target;
      return { name: a.animationName || a.transitionProperty || "script", ms: Math.round(Number(t?.duration ?? 0)), iterations: t?.iterations, target: target ? `${target.tagName.toLowerCase()}${target.className && typeof target.className === "string" ? "." + target.className.split(" ")[0] : ""}` : "" };
    })
    .filter((a) => a.ms > 1);
  const blurred = [];
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    const bf = cs.backdropFilter || cs.webkitBackdropFilter;
    if (bf && bf !== "none") {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) blurred.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : ""}: ${bf}`);
    }
  }
  return { running, blurred };
}

for (const vp of [390, 1440]) {
  for (const mode of ["reduced-motion", "reduced-transparency"]) {
    const ctx = await browser.newContext({
      viewport: { width: vp, height: vp === 390 ? 844 : 900 },
      reducedMotion: mode === "reduced-motion" ? "reduce" : "no-preference",
    });
    for (const path of pages) {
      const page = await ctx.newPage();
      if (mode === "reduced-transparency") {
        const cdp = await ctx.newCDPSession(page);
        await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
      }
      await page.goto(`${base}${path}`, { waitUntil: "networkidle" }).catch(() => {});
      await sleep(1500);
      const r = await page.evaluate(inPage);
      rows.push({ vp, mode, path, running: mode === "reduced-motion" ? r.running : undefined, blurred: mode === "reduced-transparency" ? r.blurred : undefined });
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
const bad = rows.filter((r) => (r.running?.length ?? 0) > 0 || (r.blurred?.length ?? 0) > 0);
console.log(JSON.stringify({ checked: rows.length, flagged: bad }, null, 1));
await writeFile("docs/reports/t5/reduced-audit.json", JSON.stringify(rows, null, 1));
