import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:4323/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.locator("#catalog-view[data-ready='true']").waitFor();
await page.getByRole("button", { name: "List" }).click();
await page.locator(".cat-table").waitFor();
const info = await page.evaluate(() => {
  const table = document.querySelector("#catalog [data-layout='list'] .cat-table");
  const scroll = document.querySelector("#catalog [data-layout='list'] .cat-scroll");
  const main = document.querySelector("main");
  const style = (el) => (el ? getComputedStyle(el) : null);
  return {
    tableWidth: table ? table.getBoundingClientRect().width : null,
    tableCss: style(table)?.width,
    tableMin: style(table)?.minWidth,
    scrollOverflow: style(scroll)?.overflowX,
    scrollWidth: scroll ? scroll.getBoundingClientRect().width : null,
    scrollScroll: scroll ? scroll.scrollWidth : null,
    mainMin: style(main)?.minWidth,
    mainWidth: main ? main.getBoundingClientRect().width : null,
    doc: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
