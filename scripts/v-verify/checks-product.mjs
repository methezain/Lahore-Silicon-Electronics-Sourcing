import {
  endSample,
  endVtSample,
  sleep,
  startSample,
  startVtSample,
  touchDrag,
} from "./harness.mjs";

async function ready(page) {
  await page.locator("#cart-button[data-ready='true']").waitFor({ timeout: 15000 });
}

async function product(page, slug) {
  await page.goto(`/product/${slug}`);
  await ready(page);
  await page.locator(".qty-row .buy-add").waitFor();
  await sleep(700);
}

const matrixScale = (value) => {
  const m = /matrix\(([^)]+)\)/.exec(value ?? "");
  return m ? Number(m[1].split(",")[0]) : 1;
};

export const productChecks = [
  {
    id: "P1",
    item: "Gallery: hover zoom lens, click to fullscreen viewer and back, swipe with snap and dots",
    ref: "R4",
    run: async (t) => {
      const { page } = t;
      await product(page, "lm7805");
      const slides = await page.locator(".gallery-slide").count();
      const dots = await page.locator(".gallery-dots .dot").count();
      t.note(`catalog data has ${slides} image(s) for LM7805; dots rendered: ${dots}`);
      const well = page.locator(".gallery-well");
      const box = await well.boundingBox();
      const imgSel = ".gallery-slide.is-current img";
      if (t.vp >= 900) {
        await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
        await sleep(60);
        await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.35, { steps: 3 });
        await sleep(350);
        const a = await page.locator(imgSel).evaluate((el) => ({
          t: getComputedStyle(el).transform,
          o: getComputedStyle(el).transformOrigin,
          zooming: el.closest(".gallery-well").classList.contains("is-zooming"),
        }));
        await t.shot("zoom-a");
        await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7, { steps: 6 });
        await sleep(300);
        const b = await page.locator(imgSel).evaluate((el) => ({
          t: getComputedStyle(el).transform,
          o: getComputedStyle(el).transformOrigin,
        }));
        await t.shot("zoom-b");
        t.note(`zoom A ${JSON.stringify(a)} B ${JSON.stringify(b)}`);
        if (t.reduced) {
          t.ok(matrixScale(a.t) <= 1.01, `zoom active under reduced motion: ${a.t}`);
        } else {
          t.ok(matrixScale(a.t) > 1.8, `lens scale ${matrixScale(a.t)}`);
          t.ok(a.o !== b.o, `zoom origin did not track the pointer (${a.o} → ${b.o})`);
        }
        await page.mouse.move(5, 5);
        await sleep(400);
        const out = await page.locator(imgSel).evaluate((el) => getComputedStyle(el).transform);
        t.ok(matrixScale(out) <= 1.01, `zoom did not release: ${out}`);
      } else {
        t.note("hover lens is fine-pointer only; touch opens the viewer instead");
      }

      await page.locator(".gallery-open").first().focus();
      await startSample(page, [{ key: "photo", sel: ".gallery-viewer .gallery-flyer", rect: true }], 700);
      await page.locator(".gallery-open").first().click();
      const open = await endSample(page);
      const viewer = page.locator(".gallery-viewer");
      t.ok(await viewer.evaluate((el) => el.open && el.classList.contains("is-open")), "viewer did not open");
      const widths = open.map((f) => f["photo.w"]).filter(Boolean);
      const grew = widths.length > 2 && Math.max(...widths) - Math.min(...widths) > 20;
      t.note(`flyer width ${widths.length ? `${Math.round(Math.min(...widths))} → ${Math.round(Math.max(...widths))} over ${widths.length} frames` : "never present"}`);
      if (!t.reduced) t.ok(grew, "viewer photo did not grow from the gallery position");
      await sleep(400);
      await t.shot("viewer-open");
      const fullscreen = await viewer.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.width >= innerWidth - 2 && r.height >= innerHeight - 2;
      });
      t.ok(fullscreen, "viewer is not fullscreen");

      if (t.vp < 900) {
        await page.evaluate(() => {
          const track = document.querySelector(".viewer-track");
          const slide = track.querySelector(".viewer-slide");
          for (let i = 0; i < 2; i += 1) track.appendChild(slide.cloneNode(true));
        });
        const trackBox = await page.locator(".viewer-track").boundingBox();
        await touchDrag(page, { x: 330, y: trackBox.y + 200 }, { x: 60, y: trackBox.y + 200 }, 220, 8);
        await sleep(700);
        const scroll = await page.locator(".viewer-track").evaluate((el) => ({
          left: el.scrollLeft,
          w: el.clientWidth,
          snap: getComputedStyle(el).scrollSnapType,
        }));
        t.ok(scroll.snap.includes("mandatory"), `scroll-snap-type ${scroll.snap}`);
        t.ok(Math.abs(scroll.left % scroll.w) < 2 && scroll.left > 0, `swipe did not settle on a slide (left ${scroll.left}, width ${scroll.w})`);
        t.note(`swipe mechanism proven on injected clones only: every real part has one image, so the product swipe, dots and thumbs cannot be exercised with real data (scrollLeft ${scroll.left} of slide ${scroll.w})`);
        await t.shot("viewer-swiped");
      } else {
        t.note("swipe is a touch gesture; verified at 390");
      }
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector(".gallery-viewer").open, null, { timeout: 3000 }).catch(() => {});
      await sleep(100);
      const closed = await viewer.evaluate((el) => !el.open);
      t.ok(closed, "Escape did not close the viewer");
      const focused = await page.evaluate(() => document.activeElement?.className);
      t.ok(/gallery-open/.test(focused), `focus did not return to the photo (${focused})`);
    },
  },
  {
    id: "P2",
    item: "Quantity presets (1·5·10·25 capped at stock), digits roll on stepper, price and button total roll",
    ref: "R4",
    run: async (t) => {
      const { page } = t;
      await product(page, "lm7805");
      const presets = await page.locator(".qty-presets .qty-preset").allTextContents();
      t.ok(presets.join(",") === "1,5,10,25", `LM7805 presets ${presets.join(",")}`);
      await t.shot("presets");
      const rollSpecs = [
        { key: "rolls", count: ".buy-panel .roll-out, .buy-panel .roll-in" },
        { key: "label", sel: ".qty-row .buy-add-label", text: true },
      ];
      await startSample(page, rollSpecs, 500);
      await page.locator(".qty-presets .qty-preset", { hasText: /^10$/ }).first().click();
      await sleep(70);
      await t.shot("rolling-mid", { options: { clip: { x: 0, y: 0, width: t.vp, height: 900 } } });
      const frames = await endSample(page);
      const maxRolls = Math.max(...frames.map((f) => f["rolls.count"] ?? 0));
      t.note(`roll nodes seen during preset click: ${maxRolls}; label ${frames[frames.length - 1]["label.text"]}`);
      if (t.reduced) t.ok(maxRolls === 0, `digits rolled under reduced motion (${maxRolls})`);
      else t.ok(maxRolls >= 2, `digits did not roll (${maxRolls} roll nodes)`);
      const qty = await page.getByRole("textbox", { name: "Quantity for LM7805" }).first().inputValue();
      t.ok(qty === "10", `quantity ${qty}`);
      const label = await page.locator(".qty-row .buy-add").first().innerText();
      t.ok(/Rs\s*\d/.test(label.replace(/\s+/g, " ")), `button label "${label}"`);
      const labelText = (await page.locator(".qty-row .buy-add").first().evaluate((el) => el.textContent)).replace(/\s+/g, " ");
      t.ok(/Add to cart · Rs \d/.test(labelText), `space after Rs: "${labelText}"`);
      await page.getByRole("button", { name: "Increase LM7805" }).first().click();
      await sleep(400);
      const qty2 = await page.getByRole("textbox", { name: "Quantity for LM7805" }).first().inputValue();
      t.ok(qty2 === "11", `stepper + gives ${qty2}`);
      await t.shot("after-stepper");

      await product(page, "esp32-wroom-32d");
      const esp = await page.locator(".qty-presets .qty-preset").allTextContents();
      t.note(`ESP32 (stock 9) presets: ${esp.join(",")}`);
      t.ok(esp.every((v) => Number(v) <= 9), `a preset exceeds stock 9: ${esp.join(",")}`);
      await t.shot("presets-esp32");
    },
  },
  {
    id: "P3",
    item: "Connect sequence: press, label → Added, plug halves snap, ring pulse, badge rolls, photo → cart line, sheet opens, label returns after 1.6 s",
    ref: "R4",
    run: async (t) => {
      const { page } = t;
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "userAgent", {
          get: () => "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
        });
        navigator.vibrate = (pattern) => {
          window.__vibrate = pattern;
          return true;
        };
      });
      await product(page, "lm7805");
      await t.shot("before");
      const specs = [
        { key: "btn", sel: ".qty-row .buy-add", text: true, cls: true, style: ["transform"] },
        { key: "plug", sel: "#cart-button .cart-plug", cls: true },
        { key: "left", sel: "#cart-button .cart-plug-half.is-left", style: ["transform"] },
        { key: "right", sel: "#cart-button .cart-plug-half.is-right", style: ["transform"] },
        { key: "ring", sel: "#cart-button .cart-plug-ring", style: ["opacity", "transform"] },
        { key: "count", sel: "#cart-button .cart-count", text: true },
        { key: "rolls", count: "#cart-button .roll-out, #cart-button .roll-in" },
        { key: "sheet", sel: ".cart-sheet-panel", rect: true },
        { key: "cartphoto", sel: '[data-connect-part="LM7805"]', style: ["viewTransitionName"] },
      ];
      const btn = page.locator(t.vp < 900 ? ".buy-bar .buy-add" : ".qty-row .buy-add");
      const box = await btn.boundingBox();
      await startVtSample(page, 1000);
      await startSample(page, specs, 2300);
      const shots = [];
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      shots.push(await page.screenshot({ type: "png", clip: { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 10), width: Math.min(box.width + 80, t.vp - Math.max(0, box.x - 40)), height: box.height + 20 } }));
      await page.mouse.up();
      for (let i = 0; i < 6; i += 1) {
        shots.push(await page.screenshot({ type: "png" }));
        await sleep(30);
      }
      const frames = await endSample(page);
      const vt = await endVtSample(page);
      await t.sheet("sequence", shots);
      const label = (f) => (f["btn.text"] ?? "").replace(/\s+/g, " ");
      const added = frames.find((f) => /Added/.test(label(f)));
      t.ok(!!added, "label never read Added");
      const back = frames.slice().reverse().find((f) => /Add to cart/.test(label(f)));
      const addedAt = added?.t ?? 0;
      const backAt = frames.find((f) => f.t > addedAt && /Add to cart · Rs/.test(label(f)))?.t;
      t.note(`Added at ${addedAt}ms, label back at ${backAt ?? "never"}ms (expected ≈ +1600)`);
      t.ok(backAt !== undefined && backAt - addedAt > 1300 && backAt - addedAt < 2100, `label reverted after ${backAt - addedAt}ms`);
      const joined = frames.some((f) => /is-joined/.test(f["plug.cls"] ?? ""));
      const ringed = frames.some((f) => /is-ring/.test(f["plug.cls"] ?? ""));
      const ringScales = new Set(frames.map((f) => f["ring.transform"]));
      const ringOpacities = frames.map((f) => Number(f["ring.opacity"])).filter((v) => !Number.isNaN(v));
      const counts = [...new Set(frames.map((f) => f["count.text"]))];
      const rollNodes = Math.max(...frames.map((f) => f["rolls.count"] ?? 0));
      t.note(`plug joined=${joined} ring=${ringed}; ring transforms ${ringScales.size}; max ring opacity ${Math.max(...ringOpacities).toFixed(2)}; badge ${counts.join("→")}; badge roll nodes ${rollNodes}`);
      const leftTransforms = [...new Set(frames.map((f) => f["left.transform"]))];
      t.note(`left half transforms: ${leftTransforms.length}`);
      const vib = await page.evaluate(() => window.__vibrate ?? null);
      const sheetOpened = frames.some((f) => f["sheet.x"] !== undefined && f["sheet.x"] < t.vp - 20);
      t.ok(sheetOpened, "cart sheet did not open");
      const morph = frames.some((f) => f["cartphoto.viewTransitionName"] === "part-photo-lm7805");
      t.note(`cart line took the photo's view-transition name: ${morph}; button morph group present: ${vt.some((v) => v.pseudo.includes("buy-connect"))}`);
      if (t.reduced) {
        t.ok(!ringed || Math.max(...ringOpacities) === 0, "ring pulse under reduced motion");
        t.ok(vib === null, `vibrate under reduced motion: ${vib}`);
        t.ok(!morph, "photo morph under reduced motion");
        t.ok(counts.includes("1"), `badge ${counts.join(",")}`);
      } else {
        t.ok(joined, "plug never joined");
        t.ok(ringed && Math.max(...ringOpacities) > 0.1, "ring never pulsed");
        t.ok(leftTransforms.length > 2, "plug halves did not animate");
        t.ok(counts.includes("1") && rollNodes > 0, `badge did not roll (${counts.join(",")}, ${rollNodes} roll nodes)`);
        t.ok(vib === 8, `navigator.vibrate(8) expected on Android UA, got ${vib}`);
        if (t.vp >= 900) t.ok(morph, `photo did not morph into the cart line: ${vt.map((v) => v.pseudo).filter((p) => p.includes("part-photo")).join(" ")}`);
        else t.ok(!morph, "mobile should open the sheet without the photo morph");
      }
      await sleep(300);
      await t.shot("sheet-open");
    },
  },
  {
    id: "P4",
    item: "Pinout: hover, keyboard focus (fine pointer) and tap (touch) light the pin and show its label",
    ref: "R4",
    run: async (t) => {
      const { page } = t;
      await product(page, "lm7805");
      await page.locator("#pinout").scrollIntoViewIfNeeded();
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
        document.querySelector("#pinout").scrollIntoView({ block: "start" });
        window.scrollBy(0, -140);
      });
      await sleep(400);
      await t.shot("rest");
      const rows = page.locator(".pin-row");
      const n = await rows.count();
      t.ok(n === 3, `LM7805 pin rows ${n}`);
      const lit = () =>
        page.evaluate(() => ({
          marks: [...document.querySelectorAll(".pin-mark.is-lit")].map((m) => m.dataset.pin),
          callout: document.querySelector(".pin-callout")?.textContent,
          on: document.querySelector(".pin-callout")?.classList.contains("is-on"),
          active: [...document.querySelectorAll(".pin-row.is-active")].map((r) => r.dataset.pinRow),
          pressed: [...document.querySelectorAll(".pin-row[aria-pressed='true']")].map((r) => r.dataset.pinRow),
        }));
      if (t.vp >= 900) {
        const second = rows.nth(1);
        await second.hover();
        await sleep(300);
        const hover = await lit();
        await t.shot("hover");
        t.note(`hover: ${JSON.stringify(hover)}`);
        t.ok(hover.on && hover.marks.length > 0, "hover did not light a pin or show the callout");
        t.ok(hover.callout === (await second.getAttribute("data-callout")), `callout "${hover.callout}"`);
        await page.mouse.move(5, 5);
        await sleep(300);
        t.ok((await lit()).marks.length === 0, "pin stayed lit after leaving");
        await rows.nth(0).focus();
        await page.keyboard.press("Tab");
        await sleep(300);
        const focus = await lit();
        await t.shot("focus");
        t.ok(focus.marks.length > 0 && focus.on, `keyboard focus did not light a pin: ${JSON.stringify(focus)}`);
        t.ok(focus.active.join() === (await rows.nth(1).getAttribute("data-pin-row")), `focused row active ${focus.active}`);
        const glow = await page.locator(".pin-mark.is-lit .halo").first().evaluate((el) => ({ o: getComputedStyle(el).opacity, tr: getComputedStyle(el).transitionDuration }));
        t.note(`halo ${JSON.stringify(glow)}`);
      } else {
        await rows.nth(2).tap();
        await sleep(400);
        const tap = await lit();
        await t.shot("tap-row");
        t.note(`tap row: ${JSON.stringify(tap)}`);
        t.ok(tap.on && tap.marks.length > 0, "tap on a row did not light the pin");
        await page.locator(".pin-mark .hit").first().tap({ force: true });
        await sleep(400);
        const tapPin = await lit();
        await t.shot("tap-pin");
        t.note(`tap pin: ${JSON.stringify(tapPin)}`);
      }
    },
  },
  {
    id: "P5",
    item: "Specs grouped (Electrical, Physical, In the bag), legible labels, muted units, dotted leaders",
    ref: "R4",
    modes: [
      [390, false],
      [1440, false],
    ],
    run: async (t) => {
      const { page } = t;
      await product(page, "lm7805");
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
        document.querySelector("#specs").scrollIntoView({ block: "start" });
        window.scrollBy(0, -140);
      });
      await sleep(400);
      await t.shot("specs");
      const probe = await page.evaluate(() => {
        const groups = [...document.querySelectorAll(".spec-group h3")].map((h) => h.textContent.trim());
        const dt = document.querySelector(".spec-row dt");
        const dtStyle = getComputedStyle(dt);
        const unit = document.querySelector(".spec-row .unit");
        const row = document.querySelector(".spec-row");
        const rs = getComputedStyle(row);
        const leader = [`${rs.backgroundImage.slice(0, 40)}|clip ${rs.backgroundClip}`];
        return {
          groups,
          dtFamily: dtStyle.fontFamily,
          dtTransform: dtStyle.textTransform,
          dtSize: dtStyle.fontSize,
          unitColor: unit ? getComputedStyle(unit).color : null,
          ddColor: getComputedStyle(document.querySelector(".spec-row dd")).color,
          leader,
          longest: Math.max(...[...document.querySelectorAll(".spec-row dt")].map((e) => e.textContent.length)),
        };
      });
      t.note(JSON.stringify(probe));
      t.ok(["Electrical", "Physical", "In the bag"].every((g) => probe.groups.includes(g)), `groups ${probe.groups.join(",")}`);
      t.ok(probe.dtTransform !== "uppercase", "spec labels are uppercase");
      t.ok(!/mono/i.test(probe.dtFamily), `spec labels use mono: ${probe.dtFamily}`);
      t.ok(probe.unitColor !== probe.ddColor, "unit color is not muted");
      t.ok(probe.leader.some((l) => /radial/.test(l) && /content-box/.test(l)), `dotted leader not clipped to the content box: ${probe.leader.join(" ; ")}`);
    },
  },
  {
    id: "P6",
    item: "You will also need: companion card with one-tap add",
    ref: "R4",
    run: async (t) => {
      const { page } = t;
      await product(page, "esp32-wroom-32d");
      const heading = page.getByRole("heading", { name: "You will also need" });
      await heading.scrollIntoViewIfNeeded();
      await sleep(400);
      await t.shot("rail");
      const card = page.locator(".rail li").first();
      t.ok(await card.isVisible(), "companion card not visible");
      const cartCount = () => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("lahore_silicon_cart:")).length);
      const before = await cartCount();
      const addBtn = card.getByRole("button", { name: /^Add/ }).first();
      await addBtn.click();
      await sleep(900);
      await t.shot("after-add");
      const after = await cartCount();
      t.note(`cart lines: ${before} → ${after}; badge "${(await page.locator("#cart-button .cart-count").innerText()).trim()}"`);
      t.ok(before !== after, "cart count did not change after companion add");
      const dialog = page.getByRole("dialog", { name: "Cart" });
      t.note(`cart sheet visible after companion add: ${await dialog.isVisible()}`);
      const stored = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("lahore_silicon_cart:")));
      t.ok(stored.some((k) => /AMS1117/.test(k)), `AMS1117-3.3 not in cart: ${stored.join(",")}`);
      await product(page, "lm7805");
      t.ok((await page.getByRole("heading", { name: "You will also need" }).count()) === 0, "rail shown for a part without companions");
    },
  },
  {
    id: "P7",
    item: "Section nav (Overview · Specs · Pinout · Questions) sticks and tracks scroll; links land below the header",
    ref: "R4",
    run: async (t) => {
      const { page } = t;
      await product(page, "lm7805");
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
      });
      const labels = await page.locator(".section-nav a").allTextContents();
      t.ok(labels.join(",") === "Overview,Specs,Pinout,Questions", `labels ${labels.join(",")}`);
      const seen = [];
      for (const id of ["overview", "specs", "pinout", "questions"]) {
        await page.evaluate((id) => {
          const nav = document.querySelector(".section-nav").getBoundingClientRect();
          const header = document.querySelector(".site-header").getBoundingClientRect();
          const el = document.getElementById(id);
          window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - (header.bottom + nav.height) - 8);
        }, id);
        await sleep(250);
        const current = await page.locator(".section-nav a[aria-current='true']").allTextContents();
        seen.push(`${id}→${current.join("/")}`);
      }
      t.note(seen.join("  "));
      t.ok(seen[0].endsWith("Overview") && seen[1].endsWith("Specs") && seen[2].endsWith("Pinout") && seen[3].endsWith("Questions"), `tracking: ${seen.join(" ")}`);
      await t.shot("tracking-questions");
      const stuck = await page.evaluate(() => {
        const nav = document.querySelector(".section-nav").getBoundingClientRect();
        const header = document.querySelector(".site-header").getBoundingClientRect();
        return { top: nav.top, headerBottom: header.bottom, pos: getComputedStyle(document.querySelector(".section-nav")).position };
      });
      t.ok(stuck.pos === "sticky" && stuck.top >= stuck.headerBottom - 2 && stuck.top < stuck.headerBottom + 40, `nav not stuck under header ${JSON.stringify(stuck)}`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(200);
      await page.locator(".section-nav a", { hasText: "Pinout" }).click();
      await sleep(1000);
      const landed = await page.evaluate(() => {
        const nav = document.querySelector(".section-nav").getBoundingClientRect();
        const h = document.querySelector("#pinout").getBoundingClientRect();
        return { sectionTop: h.top, navBottom: nav.bottom };
      });
      t.ok(landed.sectionTop >= landed.navBottom - 2, `section hidden under nav after click: ${JSON.stringify(landed)}`);
      await t.shot("after-click-pinout");
    },
  },
  {
    id: "P8",
    item: "FAQ accordions open and close smoothly",
    ref: "R4",
    run: async (t) => {
      const { page } = t;
      await product(page, "lm7805");
      await page.locator("#questions").scrollIntoViewIfNeeded();
      await sleep(300);
      const first = page.locator(".faq-item").first();
      await t.shot("closed");
      await startSample(page, [{ key: "panel", sel: ".faq-item:first-child .faq-panel", rect: true }, { key: "chev", sel: ".faq-item:first-child .chevron", style: ["transform"] }], 500);
      await first.locator("summary").click();
      const frames = await endSample(page);
      const heights = frames.map((f) => f["panel.h"]);
      const max = Math.max(...heights);
      const mid = heights.filter((h) => h > 1 && h < max - 1);
      t.note(`panel heights ${[...new Set(heights.map(Math.round))].join(",")}`);
      t.ok(max > 20, "panel never opened");
      if (t.reduced) t.ok(mid.length === 0, `animated height under reduced motion (${mid.length} frames)`);
      else t.ok(mid.length >= 2, `height did not animate (${mid.length} in-between frames)`);
      await t.shot("open");
      const rotated = new Set(frames.map((f) => f["chev.transform"]));
      t.note(`chevron transforms ${rotated.size}`);
      await first.locator("summary").click();
      await sleep(600);
      const closed = await first.evaluate((el) => !el.hasAttribute("open") && !el.classList.contains("is-open"));
      t.ok(closed, "second click did not close");
    },
  },
  {
    id: "P9",
    item: "Mobile product page: compact 4:5 gallery and sticky buy bar from first paint (no JS needed)",
    ref: "R4",
    modes: [
      [390, false],
      [1440, false],
    ],
    run: async (t) => {
      const { page, browser } = t;
      await page.goto("/product/lm7805");
      await sleep(900);
      await t.shot("first-screen");
      const ratio = await page.locator(".gallery-well").evaluate((el) => {
        const r = el.getBoundingClientRect();
        return Math.round((r.width / r.height) * 100) / 100;
      });
      t.note(`gallery well ratio ${ratio}`);
      if (t.vp < 900) {
        t.ok(Math.abs(ratio - 0.8) < 0.03, `gallery ratio ${ratio}, expected 4:5 (0.8)`);
        const bar = await page.locator(".buy-bar").boundingBox();
        t.ok(bar && bar.y + bar.height <= 845 && bar.y >= 0, "sticky bar not on screen");
        const noJs = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, javaScriptEnabled: false, baseURL: "http://localhost:4321" });
        const p2 = await noJs.newPage();
        await p2.goto("/product/lm7805");
        const bar2 = await p2.locator(".buy-bar").boundingBox();
        await p2.screenshot({ path: `docs/reports/v-verify/P9-${t.key}-no-js-first-paint.png` });
        t.note("no-JS first paint saved: docs/reports/v-verify/P9-390-no-js-first-paint.png");
        t.ok(bar2 && bar2.y + bar2.height <= 845 && bar2.y >= 0, `server-rendered buy bar not visible on first paint (${JSON.stringify(bar2)})`);
        await noJs.close();
      } else {
        t.ok(await page.locator(".buy-bar").isHidden(), "sticky bar shown on desktop");
      }
    },
  },
];
