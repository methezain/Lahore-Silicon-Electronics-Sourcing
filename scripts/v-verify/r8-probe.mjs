import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
await page.goto("http://localhost:4321/product/esp32-wroom-32d");
await page.waitForTimeout(800);
const info = await page.evaluate(() => {
  const el = document.querySelector("p.value.is-text");
  const cs = getComputedStyle(el);
  const range = document.createRange();
  range.selectNodeContents(el.firstChild);
  return { tw: cs.textWrap, text: el.textContent, w: el.getBoundingClientRect().width, rects: [...range.getClientRects()].map((r) => [Math.round(r.left), Math.round(r.top), Math.round(r.width)]) };
});
console.log(JSON.stringify(info));
await browser.close();
