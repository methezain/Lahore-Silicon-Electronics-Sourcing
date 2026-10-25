import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://localhost:4321";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
await page.goto(`${base}/order-success/${process.env.ORDER ?? "LHR-db9240bb016a3adb"}`);
await page.waitForTimeout(1500);
await page.emulateMedia({ media: "print" });
await page.screenshot({ path: "logs/agent/r8-receipt-print.png" });
await browser.close();
