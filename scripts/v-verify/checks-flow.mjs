import { exec as execCommand } from "node:child_process";
import { promisify } from "node:util";
import { BASE, contextOptions, endSample, sleep, startSample, touchDrag } from "./harness.mjs";

const exec = promisify(execCommand);

const CART_SEED = `
  localStorage.setItem('lahore_silicon_cart:LM7805', JSON.stringify({ part_number: 'LM7805', name: '5 V, 1 A, TO-220 linear regulator', quantity: 1 }));
  localStorage.setItem('lahore_silicon_cart:ESP32-WROOM-32D', JSON.stringify({ part_number: 'ESP32-WROOM-32D', name: 'Wi-Fi and Bluetooth module, 3.3 V', quantity: 2 }));
`;

async function seeded(page, where = "/") {
  await page.addInitScript(CART_SEED);
  await page.goto(where);
  await page.locator("#cart-button[data-ready='true']").waitFor({ timeout: 15000 });
  await sleep(500);
}

async function dragPanel(t, { dx, ms, steps }) {
  const { page } = t;
  const head = await page.locator(".cart-heading").boundingBox();
  const from = { x: head.x + 20, y: head.y + head.height / 2 };
  if (t.vp < 900) {
    await touchDrag(page, from, { x: from.x + dx, y: from.y }, ms, steps);
    return;
  }
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i += 1) {
    await page.mouse.move(from.x + (dx * i) / steps, from.y);
    await sleep(ms / steps);
  }
  await page.mouse.up();
}

const fill = {
  name: "Verify Bot",
  phone: "03001234567",
  city: "Lahore",
  address: "House 12, Mall Road",
  payment: "TXN12345",
};

async function fillCheckout(page) {
  await page.locator("#field-name").fill(fill.name);
  await page.locator("#field-phone").fill(fill.phone);
  await page.locator("#field-destination").fill(fill.city);
  await page.locator("#field-address").fill(fill.address);
  await page.locator("#field-payment-ref").fill(fill.payment);
}

async function resetStock() {
  const sql = "UPDATE stock SET qty = 48 WHERE part_number = 'LM7805'";
  await exec(`npx wrangler d1 execute electronics-sourcing-db --local --command "${sql}"`, { timeout: 60000 });
}

export const flowChecks = [
  {
    id: "K1",
    item: "Cart sheet: spring open and close, scrim fade, drag to dismiss with velocity (return when slow, close on flick)",
    ref: "R5",
    run: async (t) => {
      const { page } = t;
      await seeded(page);
      const specs = [
        { key: "panel", sel: ".cart-sheet-panel", rect: true, style: ["opacity"] },
        { key: "scrim", sel: ".cart-scrim", style: ["opacity"] },
      ];
      await startSample(page, specs, 700);
      await page.locator("#cart-button").click();
      const open = await endSample(page);
      const xs = open.map((f) => f["panel.x"]).filter((v) => v !== undefined);
      const finalX = xs[xs.length - 1];
      const mid = xs.filter((x) => x > finalX + 3 && x < t.vp);
      const fades = open.map((f) => Number(f["panel.opacity"])).filter((v) => !Number.isNaN(v));
      const scrims = [...new Set(open.map((f) => Number(f["scrim.opacity"]).toFixed(2)))];
      t.note(`open: panel x ${xs[0]} → ${finalX}, ${mid.length} in-between frames; opacity range ${Math.min(...fades).toFixed(2)}–${Math.max(...fades).toFixed(2)}; scrim steps ${scrims.length}`);
      const overshoot = xs.some((x) => x < finalX - 1);
      t.note(`overshoot past rest: ${overshoot}`);
      if (t.reduced) {
        t.ok(mid.length <= 1, `slides under reduced motion (${mid.length} frames)`);
      } else {
        t.ok(mid.length >= 3, `sheet did not slide with a spring (${mid.length} frames)`);
        t.ok(scrims.length > 2, "scrim did not fade");
      }
      await sleep(500);
      await t.shot("open");

      await startSample(page, specs, 700);
      await page.keyboard.press("Escape");
      const close = await endSample(page);
      const cx = close.map((f) => f["panel.x"]).filter((v) => v !== undefined);
      const cmid = cx.filter((x) => x > finalX + 3 && x < t.vp);
      t.note(`close: ${cmid.length} in-between frames`);
      if (!t.reduced) t.ok(cmid.length >= 2, "close did not animate");
      await sleep(400);
      t.ok(await page.getByRole("dialog", { name: "Cart" }).isHidden(), "sheet still visible after Escape");

      await page.locator("#cart-button").click();
      await sleep(900);
      const dialog = page.getByRole("dialog", { name: "Cart" });
      const mark = async () =>
        page.evaluate(() => ({
          dragging: document.querySelector(".cart-sheet")?.getAttribute("data-dragging"),
          x: document.querySelector(".cart-sheet-panel")?.getBoundingClientRect().x,
        }));

      await dragPanel(t, { dx: 70, ms: 700, steps: 14 });
      await sleep(900);
      const slowOpen = await dialog.isVisible();
      const slowX = (await mark()).x;
      t.ok(slowOpen && Math.abs(slowX - finalX) < 3, `slow short drag did not return (x ${slowX} vs ${finalX}, open ${slowOpen})`);
      await t.shot("after-slow-drag");

      const head = await page.locator(".cart-heading").boundingBox();
      const from = { x: head.x + 20, y: head.y + head.height / 2 };
      if (t.vp >= 900) {
        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        await page.mouse.move(from.x + 60, from.y, { steps: 4 });
        const during = await mark();
        t.ok(during.dragging === "true", `data-dragging while dragging: ${during.dragging}`);
        t.ok(during.x > finalX + 20, "panel did not follow the pointer");
        await t.shot("mid-drag");
        await page.mouse.up();
        await sleep(900);
      }
      await startSample(page, specs, 900);
      await dragPanel(t, { dx: 190, ms: 90, steps: 6 });
      const flick = await endSample(page);
      const fx = flick.map((f) => f["panel.x"]).filter((v) => v !== undefined);
      await sleep(500);
      t.ok(await dialog.isHidden(), "flick did not dismiss the sheet");
      t.note(`flick: panel x ${fx[0]} → ${Math.max(...fx)} (max); ${fx.length} frames`);
      const focus = await page.evaluate(() => document.activeElement?.id);
      t.ok(focus === "cart-button", `focus after drag-dismiss: ${focus}`);
    },
  },
  {
    id: "K2",
    item: "Cart lines stagger in, remove collapses height, totals and count roll, companions block",
    ref: "R5",
    run: async (t) => {
      const { page } = t;
      await seeded(page);
      await startSample(page, [
        { key: "l1", sel: ".cart-line-clip:nth-child(1) .cart-copy", style: ["opacity"] },
        { key: "l2", sel: ".cart-line-clip:nth-child(2) .cart-copy", style: ["opacity"] },
      ], 700);
      await page.locator("#cart-button").click();
      const entry = await endSample(page);
      const lagged = entry.some((f) => Number(f["l1.opacity"]) - Number(f["l2.opacity"]) > 0.05);
      const started = entry.some((f) => Number(f["l1.opacity"]) < 0.5);
      t.note(`line entrance: l1 ahead of l2 in some frame ${lagged}; l1 started below 0.5 ${started}`);
      if (t.reduced) t.ok(!lagged, "lines stagger under reduced motion");
      else t.ok(lagged, "lines do not stagger in");
      await sleep(700);
      await t.shot("open");
      const dialog = page.getByRole("dialog", { name: "Cart" });
      const lineCount = () => dialog.locator(".cart-line-fold").count();
      const before = await lineCount();
      t.ok(before === 2, `cart lines ${before}`);

      await startSample(page, [{ key: "total", sel: ".cart-total-amount", text: true }, { key: "rolls", count: ".cart-sheet .cart-roll-out, .cart-sheet .cart-roll-in" }], 450);
      await dialog.getByRole("button", { name: "Increase LM7805" }).click();
      const rolled = await endSample(page);
      const maxRolls = Math.max(...rolled.map((f) => f["rolls.count"] ?? 0));
      t.note(`totals: roll nodes seen ${maxRolls}`);
      if (t.reduced) t.ok(maxRolls === 0, `rolled under reduced motion (${maxRolls})`);
      else t.ok(maxRolls > 0, "totals did not roll");

      const companions = await dialog.locator(".cart-companions").count();
      t.note(`companions block rendered: ${companions}`);
      if (companions) {
        await dialog.locator(".cart-companions").scrollIntoViewIfNeeded();
        await t.shot("companions");
      }

      const target = dialog.locator(".cart-line-fold").first();
      const hBefore = await target.evaluate((el) => el.getBoundingClientRect().height);
      await startSample(page, [{ key: "line", sel: ".cart-sheet .cart-line-fold", rect: true, style: ["opacity"] }], 600);
      await dialog.getByRole("button", { name: /Remove/ }).first().click();
      const gone = await endSample(page);
      const hs = gone.map((f) => f["line.h"]).filter((v) => v !== undefined);
      const mids = hs.filter((h) => h > 2 && h < hBefore - 2);
      t.note(`remove: line height ${Math.round(hBefore)} → ${Math.round(hs[hs.length - 1] ?? 0)}; ${mids.length} in-between frames`);
      await sleep(400);
      t.ok((await lineCount()) === before - 1, "line was not removed");
      if (t.reduced) t.ok(mids.length === 0, "collapsed with animation under reduced motion");
      else t.ok(mids.length >= 2, `height did not collapse smoothly (${mids.length} frames)`);
      await t.shot("after-remove");
    },
  },
  {
    id: "K3",
    item: "Checkout: step progress across three steps, field validation animates in without layout jump, errors keep typed values",
    ref: "R5",
    run: async (t) => {
      const { page } = t;
      await seeded(page, "/checkout");
      await page.locator("#submit-btn:not([disabled])").waitFor({ timeout: 10000 });
      await sleep(400);
      const progress = () =>
        page.evaluate(() => ({
          done: document.querySelector("#checkout-progress")?.getAttribute("data-done"),
          states: [...document.querySelectorAll("#checkout-progress li")].map((li) => li.dataset.state).join("/"),
          fill: Math.round(document.querySelector(".steps-fill")?.getBoundingClientRect().width ?? 0),
        }));
      const p0 = await progress();
      await t.shot("progress-0");
      await page.locator("#field-name").fill(fill.name);
      await page.locator("#field-phone").fill(fill.phone);
      await sleep(500);
      const p1 = await progress();
      await page.locator("#field-destination").fill(fill.city);
      await page.locator("#field-address").fill(fill.address);
      await sleep(500);
      const p2 = await progress();
      await t.shot("progress-2");
      await page.locator("#field-payment-ref").fill(fill.payment);
      await sleep(500);
      const p3 = await progress();
      await t.shot("progress-3");
      t.note(`progress: ${JSON.stringify([p0, p1, p2, p3])}`);
      t.ok(p0.done === "0" && Number(p1.done) >= 1 && Number(p2.done) >= 2 && Number(p3.done) === 3, `data-done ${[p0, p1, p2, p3].map((p) => p.done).join("→")}`);
      t.ok(p3.fill > p1.fill && p1.fill >= p0.fill, `progress fill width ${[p0, p1, p2, p3].map((p) => p.fill).join("→")}`);

      const fresh = await t.browser.newContext({ ...contextOptions(t.vp, t.reduced), baseURL: BASE });
      const v = await fresh.newPage();
      await v.addInitScript(CART_SEED);
      await v.goto("/checkout");
      await v.locator("#submit-btn:not([disabled])").waitFor({ timeout: 10000 });
      await sleep(700);
      await v.locator("#field-phone").fill("123");
      const anchor = async () =>
        v.evaluate(() => ({
          place: Math.round(document.querySelector("#submit-btn").getBoundingClientRect().y + window.scrollY),
          addr: Math.round(document.querySelector("#field-address").getBoundingClientRect().y + window.scrollY),
          pay: Math.round(document.querySelector("#field-payment-ref").getBoundingClientRect().y + window.scrollY),
        }));
      const before = await anchor();
      await startSample(v, [
        { key: "err", sel: "#field-name-error .field-error-text", style: ["opacity", "transform"] },
        { key: "st", sel: "#field-name-error", attrs: ["data-state"] },
        { key: "ph", sel: "#field-phone-error", style: ["opacity"], attrs: ["data-state"] },
      ], 700);
      await v.locator("#submit-btn").click();
      const frames = await endSample(v);
      await sleep(300);
      const after = await anchor();
      const opacities = [...new Set(frames.map((f) => Number(f["err.opacity"]).toFixed(2)))];
      t.note(`error opacity steps ${opacities.join(",")}; layout before ${JSON.stringify(before)} after ${JSON.stringify(after)}`);
      t.ok(frames.some((f) => f["st@data-state"] === "shown"), "name error never shown");
      if (t.reduced) {
        t.ok(!frames.some((f) => f["err.transform"] && f["err.transform"] !== "none" && f["err.transform"] !== "matrix(1, 0, 0, 1, 0, 0)"), "error rises under reduced motion");
      } else {
        t.ok(opacities.length > 3, `error did not fade in (${opacities.length} steps)`);
        t.ok(frames.some((f) => f["err.transform"] && f["err.transform"] !== "none"), "error did not rise");
      }
      t.ok(Math.abs(after.place - before.place) <= 2 && Math.abs(after.pay - before.pay) <= 2, "layout jumped when errors appeared");
      await t.shot("errors", { target: v });
      t.ok((await v.locator("#field-phone").inputValue()) === "123", "typed phone value was not kept");
      t.ok(await v.locator("#field-name").evaluate((el) => document.activeElement === el), "first invalid field not focused");
      const ring = await v.locator("#field-name").evaluate((el) => getComputedStyle(el.closest(".field, div") ?? el).boxShadow);
      t.note(`invalid ring: ${ring.slice(0, 60)}`);
      await v.locator("#field-name").fill("Ali");
      await sleep(500);
      const cleared = await v.locator("#field-name-error").getAttribute("data-state");
      t.ok(cleared === "idle", `error did not clear on fix (${cleared})`);
      const payTotal = await v.locator("#pay-total").textContent();
      const summary = await v.locator("#summary-total").textContent();
      t.ok(payTotal.replace(/\s/g, "") === summary.replace(/\s/g, ""), `pay ${payTotal} vs summary ${summary}`);
      await fresh.close();
    },
  },
  {
    id: "K4",
    item: "Payment panel copy feedback (label and live region)",
    ref: "R5",
    modes: [
      [390, false],
      [1440, false],
      [1440, true],
    ],
    run: async (t) => {
      const { page } = t;
      await seeded(page, "/checkout");
      await page.locator("#submit-btn:not([disabled])").waitFor({ timeout: 10000 });
      const copy = page.locator(".copy-btn").first();
      t.ok((await copy.count()) > 0, "no copy button on the payment panel");
      if ((await copy.count()) === 0) return;
      await copy.scrollIntoViewIfNeeded();
      await t.shot("before");
      const label = await copy.innerText();
      await copy.click();
      await sleep(150);
      const during = { text: await copy.innerText(), status: await page.locator("#copy-status").innerText() };
      await t.shot("copied");
      t.ok(/Copied/.test(during.text) && during.status === "Copied", `copy feedback ${JSON.stringify(during)}`);
      const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
      t.note(`clipboard after copy: ${clip === null ? "unreadable" : JSON.stringify(clip.slice(0, 30))}`);
      await sleep(1900);
      t.ok((await copy.innerText()) === label, "label did not revert after 1.6 s");
    },
  },
  {
    id: "K5",
    item: "Order received: plug connects, ring pulses, check draws, receipt slides out, status timeline; no dead end",
    ref: "R5",
    modes: [
      [390, false],
      [1440, false],
      [1440, true],
    ],
    run: async (t) => {
      const { page } = t;
      await page.addInitScript(`
        localStorage.setItem('lahore_silicon_cart:LM7805', JSON.stringify({ part_number: 'LM7805', name: '5 V, 1 A, TO-220 linear regulator', quantity: 1 }));
      `);
      await page.goto("/checkout");
      await page.locator("#submit-btn:not([disabled])").waitFor({ timeout: 10000 });
      await fillCheckout(page);
      await page.addInitScript(() => {
        if (!location.pathname.startsWith("/order-success")) return;
        window.__ord = [];
        const t0 = performance.now();
        const tick = () => {
          const read = (sel, props) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const cs = getComputedStyle(el);
            return props.map((p) => cs[p]).join("|");
          };
          window.__ord.push({
            t: Math.round(performance.now() - t0),
            ring: read(".connect-ring", ["opacity", "transform"]),
            left: read(".half-left", ["transform"]),
            check: read(".connect-check", ["clipPath"]),
            print: read(".print-window", ["transform"]),
            sheet: read(".receipt-sheet", ["transform", "opacity"]),
          });
          if (performance.now() - t0 < 4500) requestAnimationFrame(tick);
        };
        tick();
      });
      await page.waitForFunction(() => document.getElementById("checkout-turnstile-token")?.value, null, { timeout: 15000 });
      const submit = page.locator("#submit-btn");
      await submit.click();
      await page.waitForURL(/\/order-success\//, { timeout: 30000 });
      const shots = [];
      for (let i = 0; i < 6; i += 1) {
        shots.push(await page.screenshot({ type: "png" }));
        await sleep(120);
      }
      await t.sheet("sequence", shots);
      await sleep(2200);
      const frames = await page.evaluate(() => window.__ord ?? []);
      const uniq = (key) => new Set(frames.map((f) => f[key])).size;
      t.note(`samples ${frames.length}; distinct ring ${uniq("ring")} left-half ${uniq("left")} check ${uniq("check")} print ${uniq("print")} sheet ${uniq("sheet")}`);
      if (t.reduced) {
        t.ok(uniq("left") <= 2 && uniq("print") <= 2, "order-received animates under reduced motion");
      } else {
        t.ok(uniq("left") > 3, "plug halves did not move");
        t.ok(uniq("ring") > 3, "ring did not pulse");
        t.ok(uniq("check") > 3, "check did not draw");
        t.ok(uniq("print") > 3 || uniq("sheet") > 3, "receipt did not slide out");
      }
      await t.shot("final", { options: { fullPage: true } });
      const probe = await page.evaluate(() => ({
        title: document.querySelector("h1")?.textContent,
        receipt: !!document.querySelector(".receipt-sheet"),
        timeline: [...document.querySelectorAll(".timeline li")].map((li) => `${li.querySelector(".step-name")?.textContent}:${li.dataset.done}`),
        actions: [...document.querySelectorAll(".actions a, .actions button")].map((a) => a.textContent.trim()),
        total: document.querySelector(".total .money")?.textContent,
      }));
      t.note(JSON.stringify(probe));
      t.ok(probe.receipt && probe.timeline.length >= 3, `receipt/timeline missing ${JSON.stringify(probe)}`);
      t.ok(probe.actions.length > 0, "order received page has no next action");
      await resetStock();
    },
  },
  {
    id: "S1",
    item: "Command palette: opens from trigger (/, Ctrl K), sections, highlighted matches, sliding selection, hints, thumbnails, stock and price",
    ref: "R6",
    run: async (t) => {
      const { page } = t;
      await page.goto("/");
      await page.locator("#search-open[data-ready='true']").waitFor({ timeout: 15000 });
      await sleep(600);
      const dialog = page.getByRole("dialog", { name: "Search parts" });
      await startSample(page, [{ key: "panel", sel: ".search-panel", style: ["opacity", "transform", "transformOrigin"] }], 500);
      await page.locator("#search-open").click();
      const open = await endSample(page);
      const ops = [...new Set(open.map((f) => Number(f["panel.opacity"]).toFixed(2)))];
      t.note(`open: opacity steps ${ops.length}; origin ${open[2]?.["panel.transformOrigin"]}; transform ${open[2]?.["panel.transform"]}`);
      t.ok(await dialog.isVisible(), "palette did not open from the trigger");
      const fromTrigger = open.some((f) => f["panel.transform"] && f["panel.transform"] !== "none" && f["panel.transform"] !== "matrix(1, 0, 0, 1, 0, 0)");
      t.note(`palette starts offset toward the trigger: ${fromTrigger}`);
      if (!t.reduced) t.ok(fromTrigger, "palette does not grow from the trigger position");
      if (t.reduced) t.ok(!open.some((f) => /matrix\(0\.9/.test(f["panel.transform"] ?? "")), "scales under reduced motion");
      else t.ok(ops.length > 3, "open did not animate");
      await sleep(400);
      await t.shot("empty");
      const emptySections = await dialog.locator(".search-section").allTextContents();
      t.note(`sections before typing: ${emptySections.join(", ")}`);

      const combo = dialog.getByRole("combobox", { name: "Search parts" });
      await combo.fill("lm");
      await sleep(300);
      const sections = await dialog.locator(".search-section").allTextContents();
      t.note(`sections for "lm": ${sections.join(", ")}`);
      t.ok(sections.map((x) => x.toLowerCase()).includes("parts"), `Parts section missing: ${sections.join(",")}`);
      const marks = await dialog.locator(".search-hit mark").count();
      t.ok(marks > 0, "matched characters are not highlighted");
      const thumb = await dialog.locator(".search-photo img").first().evaluate((img) => img.naturalWidth > 0).catch(() => false);
      t.ok(thumb, "no loaded thumbnail in results");
      const meta = await dialog.locator(".search-hit").first().innerText();
      t.ok(/Rs\s?\d/.test(meta) && /stock/i.test(meta), `row lacks price or stock: ${meta.replace(/\s+/g, " ")}`);
      const hints = await dialog.locator(".search-hints").innerText();
      t.ok(/Select/.test(hints) && /Open/.test(hints) && /Close/.test(hints), `hints "${hints.replace(/\s+/g, " ")}"`);
      await t.shot("lm");

      const bar = dialog.locator(".search-selection");
      await startSample(page, [{ key: "sel", sel: ".search-selection", style: ["transform"] }], 400);
      await page.keyboard.press("ArrowDown");
      const slide = await endSample(page);
      const tr = [...new Set(slide.map((f) => f["sel.transform"]))];
      t.note(`selection transforms during ArrowDown: ${tr.length}`);
      if (t.reduced) t.ok(tr.length <= 2, "selection slides under reduced motion");
      else t.ok(tr.length > 2, "selection highlight did not slide");
      t.ok(await bar.isVisible(), "no selection highlight element");
      await page.keyboard.press("Enter");
      await page.waitForURL(/\/product\//, { timeout: 8000 });
      await page.locator("#search-open[data-ready='true']").waitFor();

      await page.keyboard.press("Control+k");
      const reopened = await dialog.isVisible();
      t.ok(reopened, "Ctrl K did not open");
      await sleep(400);
      const recent = await dialog.locator(".search-section").allTextContents();
      t.ok(recent.map((x) => x.toLowerCase()).includes("recent"), `Recent section after opening a part: ${recent.join(",")}`);
      await t.shot("recent");
      await page.keyboard.press("Escape");
      await sleep(300);
      await page.keyboard.press("/");
      t.ok(await dialog.isVisible(), "/ did not open the palette");
    },
  },
  {
    id: "S2",
    item: "/quick-order with a 6-line BOM: preview matches, misses and stock limits, one-action add, under 10 s",
    ref: "R6",
    run: async (t) => {
      const { page } = t;
      await page.goto("/quick-order");
      await page.locator("#quick-order-list").waitFor();
      await sleep(600);
      const bom = ["LM7805 x10", "NE555, 5", "ams1117 3.3 - 20", "DS18B20 x4", "ESP32-WROOM-32D x20", "TIP120 x2"].join("\n");
      await t.shot("empty");
      const start = Date.now();
      await page.locator("#quick-order-list").fill(bom);
      const summary = page.locator("#quick-order-summary");
      await summary.waitFor({ timeout: 8000 });
      const text = (await summary.innerText()).replace(/\s+/g, " ");
      t.note(`summary: ${text}`);
      t.ok(/5 parts match/.test(text) && /1 is not stocked/.test(text) && /1 quantity was set to the stock count/.test(text), `summary "${text}"`);
      await t.shot("preview", { options: { fullPage: true } });
      await page.getByRole("button", { name: /^Add 5 parts to cart/ }).click();
      const dialog = page.getByRole("dialog", { name: "Cart" });
      await dialog.waitFor();
      const elapsed = Date.now() - start;
      t.note(`paste → cart open: ${elapsed} ms`);
      t.ok(elapsed < 10000, `took ${elapsed} ms`);
      await sleep(600);
      await t.shot("cart");
      const stored = await page.evaluate(() =>
        Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith("lahore_silicon_cart:")).map((k) => [k.split(":")[1], JSON.parse(localStorage.getItem(k)).quantity])),
      );
      t.note(`cart: ${JSON.stringify(stored)}`);
      const want = { LM7805: 10, NE555: 5, "AMS1117-3.3": 20, DS18B20: 4, "ESP32-WROOM-32D": 9 };
      t.ok(JSON.stringify(Object.entries(stored).sort()) === JSON.stringify(Object.entries(want).sort()), `cart ${JSON.stringify(stored)} ≠ ${JSON.stringify(want)}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      t.ok(overflow <= 1, `overflow ${overflow}`);
    },
  },
  {
    id: "S3",
    item: "Shareable cart link rebuilds the cart; WhatsApp send only when a shop number exists",
    ref: "R6",
    modes: [
      [390, false],
      [1440, false],
    ],
    run: async (t) => {
      const { page, browser } = t;
      await page.addInitScript(CART_SEED);
      await page.goto("/");
      await page.locator("#cart-button[data-ready='true']").waitFor();
      await page.locator("#cart-button").click();
      const dialog = page.getByRole("dialog", { name: "Cart" });
      await dialog.waitFor();
      await sleep(700);
      const copy = dialog.getByRole("button", { name: "Copy cart link" });
      await copy.scrollIntoViewIfNeeded();
      await copy.click();
      await sleep(250);
      await t.shot("copied");
      const link = await page.evaluate(() => navigator.clipboard.readText());
      const plain = decodeURIComponent(link);
      t.note(`link: ${plain}`);
      t.ok(/\/quick-order\?cart=/.test(plain) && plain.includes("LM7805:1") && plain.includes("ESP32-WROOM-32D:2"), `link ${plain}`);
      const wa = await dialog.locator(".cart-share-wa").count();
      const configured = await page.locator("footer a[href^='https://wa.me/']").count();
      t.note(`WhatsApp link rendered: ${wa}; shop number configured (footer wa.me link): ${configured > 0}`);
      t.ok((wa > 0) === (configured > 0), "WhatsApp send link must appear only when a shop number is configured");
      const fresh = await browser.newContext({ viewport: { width: t.vp, height: 844 }, baseURL: "http://localhost:4321" });
      const p2 = await fresh.newPage();
      await p2.goto(link.replace(/^https?:\/\/[^/]+/, ""));
      await p2.locator("#cart-button[data-ready='true']").waitFor();
      await sleep(700);
      const rebuilt = await p2.evaluate(() =>
        Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith("lahore_silicon_cart:")).map((k) => [k.split(":")[1], JSON.parse(localStorage.getItem(k)).quantity])),
      );
      await p2.screenshot({ path: `docs/reports/v-verify/S3-${t.key}-fresh-visitor.png` });
      t.note(`fresh visitor cart: ${JSON.stringify(rebuilt)}; screenshot docs/reports/v-verify/S3-${t.key}-fresh-visitor.png`);
      t.ok(rebuilt.LM7805 === 1 && rebuilt["ESP32-WROOM-32D"] === 2, `rebuilt cart ${JSON.stringify(rebuilt)}`);
      await fresh.close();
    },
  },
];
