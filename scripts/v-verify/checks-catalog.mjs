import {
  endSample,
  endVtSample,
  sleep,
  startSample,
  startVtSample,
  stats,
} from "./harness.mjs";

const REVEAL_PROBE = () => {
  window.addEventListener("pagereveal", (event) => {
    const vt = event.viewTransition;
    if (!vt) {
      sessionStorage.setItem("__vt", "none");
      return;
    }
    vt.ready
      .then(() => {
        const names = new Set();
        for (const a of document.getAnimations()) {
          const p = a.effect && a.effect.pseudoElement;
          if (p) names.add(p);
        }
        sessionStorage.setItem("__vt", JSON.stringify([...names]));
      })
      .catch(() => sessionStorage.setItem("__vt", "skipped"));
  });
};

async function ready(page) {
  await page.locator("#cart-button[data-ready='true']").waitFor({ timeout: 15000 });
}

async function visibleLink(page, partNumber) {
  return page
    .locator(`#catalog [data-part="${partNumber}"] a[href^="/product/"]:visible`)
    .first();
}

async function burst(page, count, gap = 30) {
  const frames = [];
  for (let i = 0; i < count; i += 1) {
    try {
      frames.push(await page.screenshot({ type: "png", timeout: 3000 }));
    } catch {
      break;
    }
    await sleep(gap);
  }
  return frames;
}

export const catalogChecks = [
  {
    id: "N1",
    item: "Catalog → product photo morph, header persistent, no white flash (and back)",
    ref: "R1.4",
    run: async (t) => {
      const { page } = t;
      await page.addInitScript(REVEAL_PROBE);
      await page.goto("/");
      await ready(page);
      const link = await visibleLink(page, "LM7805");
      await link.scrollIntoViewIfNeeded();
      const headerBefore = await page.locator(".site-header").boundingBox();
      await link.click({ noWaitAfter: true });
      const frames = await burst(page, 10, 20);
      await page.waitForURL(/\/product\/lm7805/);
      await sleep(900);
      frames.push(await page.screenshot({ type: "png" }));
      const flat = [];
      for (const f of frames) flat.push(await stats(f));
      const blank = flat.filter((s) => s.std < 1.5 && s.mean > 252);
      t.ok(blank.length === 0, `white flash frames: ${blank.length} of ${flat.length}`);
      t.note(`frames: ${flat.map((s) => `${s.mean}/${s.std}`).join(" ")}`);
      await t.sheet("forward-frames", frames.slice(0, 8));
      const vt = await page.evaluate(() => sessionStorage.getItem("__vt"));
      const morphed = vt && vt.includes("part-photo-lm7805");
      if (t.reduced) {
        t.ok(!morphed, `reduced motion still morphs: ${vt}`);
      } else {
        t.ok(morphed, `no part-photo morph pseudo animation: ${vt}`);
      }
      t.note(`view-transition pseudos on arrival: ${vt}`);
      const headerAfter = await page.locator(".site-header").boundingBox();
      t.ok(
        Math.abs((headerAfter?.y ?? 0) - (headerBefore?.y ?? 0)) < 1,
        "header moved between pages",
      );
      await t.shot("product-arrived");

      await page.evaluate(() => sessionStorage.removeItem("__vt"));
      await page.goBack({ waitUntil: "commit" });
      const back = await burst(page, 8, 20);
      await sleep(800);
      back.push(await page.screenshot({ type: "png" }));
      const backStats = [];
      for (const f of back) backStats.push(await stats(f));
      const backBlank = backStats.filter((s) => s.std < 1.5 && s.mean > 252);
      t.ok(backBlank.length === 0, `white flash on back: ${backBlank.length}`);
      await t.sheet("back-frames", back.slice(0, 8));
      const vtBack = await page.evaluate(() => sessionStorage.getItem("__vt"));
      t.note(`view-transition pseudos on back: ${vtBack}`);
    },
  },
  {
    id: "N2",
    item: "Speculation Rules: prerender product links (moderate), skip checkout/api; prefetch fallback",
    ref: "R1.5",
    modes: [[1440, false]],
    run: async (t) => {
      const { page } = t;
      await page.goto("/");
      await ready(page);
      const rules = await page.locator('script[type="speculationrules"]').textContent();
      t.ok(rules.includes('"prerender"'), "no prerender rule");
      t.ok(rules.includes('"eagerness":"moderate"'), "eagerness not moderate");
      t.ok(rules.includes("/product/*"), "product pattern missing");
      t.ok(rules.includes("/checkout") && rules.includes("/api/*"), "exclusions missing");
      const prefetch = await page
        .locator("#catalog a.part-link")
        .first()
        .getAttribute("data-astro-prefetch");
      t.ok(prefetch === "hover", `astro prefetch fallback attr: ${prefetch}`);
      const link = await visibleLink(page, "NE555");
      await link.hover();
      await sleep(800);
      await link.click({ noWaitAfter: true });
      await page.waitForURL(/\/product\/ne555/);
      const activation = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        return { activationStart: nav.activationStart ?? null, type: nav.type };
      });
      t.note(`rules: ${rules}`);
      t.note(`navigation entry after hover+click: ${JSON.stringify(activation)}`);
      if (!(activation.activationStart > 0)) {
        t.note("prerender activation not observed in headless Chromium; rules verified by text only");
      }
    },
  },
  {
    id: "N3",
    item: "Header condenses on scroll (64 → 52px, stronger shadow) and restores",
    ref: "R1.6",
    run: async (t) => {
      const { page } = t;
      await page.goto("/");
      await ready(page);
      const bar = page.locator(".site-bar");
      const rest = await bar.evaluate((el) => ({
        h: el.getBoundingClientRect().height,
        shadow: getComputedStyle(el).boxShadow,
        dur: getComputedStyle(el).transitionDuration,
      }));
      await t.shot("top");
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
      });
      await startSample(
        page,
        [{ key: "bar", sel: ".site-bar", rect: true }],
        500,
      );
      await page.evaluate(() => window.scrollTo(0, 200));
      const frames = await endSample(page);
      const heights = frames.map((f) => f["bar.h"]);
      await t.shot("condensed");
      const condensed = await bar.evaluate((el) => ({
        h: el.getBoundingClientRect().height,
        shadow: getComputedStyle(el).boxShadow,
      }));
      t.ok(condensed.h === 52, `condensed height ${condensed.h}`);
      t.ok(condensed.shadow !== rest.shadow, "shadow did not change");
      t.ok(
        await page.locator(".site-header").evaluate((el) => el.classList.contains("is-condensed")),
        "is-condensed class missing",
      );
      const mid = heights.filter((h) => h > 52 && h < rest.h);
      if (t.reduced) t.ok(mid.length === 0, `animated while reduced: ${mid.join(",")}`);
      else t.ok(mid.length >= 1, `no in-between heights (instant jump): ${[...new Set(heights)].join(",")}`);
      t.note(`rest ${rest.h}px → ${condensed.h}px; sampled heights ${[...new Set(heights)].join(",")}`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(500);
      const back = await bar.evaluate((el) => el.getBoundingClientRect().height);
      t.ok(back === rest.h, `restore height ${back}`);
    },
  },
  {
    id: "A1",
    item: "Photo stage and package illustrations: every surface shows a photo or illustration, no empty grey squares",
    ref: "R2",
    modes: [
      [390, false],
      [1440, false],
    ],
    run: async (t) => {
      const { page } = t;
      const slugs = [
        "lm7805",
        "ams1117-3.3",
        "arduino-nano",
        "ds18b20",
        "esp32-wroom-32d",
        "hc-sr04",
        "lm2596s",
        "ne555",
        "srd-05vdc-sl-c",
        "tcrt5000",
      ];
      const bad = [];
      for (const slug of slugs) {
        await page.goto(`/product/${slug}`);
        await page.locator(".gallery-well").waitFor();
        await page.waitForLoadState("load");
        const probe = await page.evaluate(async () => {
          const img = document.querySelector(".gallery-well img");
          if (img && !img.complete) await new Promise((r) => img.addEventListener("load", r, { once: true }));
          const well = document.querySelector(".gallery-well");
          const r = well.getBoundingClientRect();
          return {
            loaded: !!img && img.naturalWidth > 0,
            fallback: !!document.querySelector(".gallery-well .fallback"),
            ratio: Math.round((r.width / r.height) * 100) / 100,
            w: Math.round(r.width),
          };
        });
        if (!probe.loaded && !probe.fallback) bad.push(slug);
        t.note(`${slug}: loaded=${probe.loaded} fallback=${probe.fallback} well ${probe.w} ratio ${probe.ratio}`);
        await t.shot(`pdp-${slug}`, { options: { clip: { x: 0, y: 0, width: t.vp, height: 700 } } });
      }
      t.ok(bad.length === 0, `parts with neither photo nor illustration: ${bad.join(",")}`);

      for (const path of ["/", "/home"]) {
        await page.goto(path);
        await ready(page);
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 500) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          window.scrollTo(0, document.body.scrollHeight);
          const pending = [...document.querySelectorAll("img")].filter((img) => img.getBoundingClientRect().width > 0 && !img.complete);
          await Promise.race([
            Promise.all(pending.map((img) => new Promise((r) => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true }); }))),
            new Promise((r) => setTimeout(r, 6000)),
          ]);
          window.scrollTo(0, 0);
        });
        await sleep(300);
        const imgs = await page.evaluate(() =>
          [...document.querySelectorAll("img")]
            .filter((img) => img.getBoundingClientRect().width > 0)
            .map((img) => ({ src: `${img.currentSrc || img.src} complete=${img.complete} loading=${img.loading} nw=${img.naturalWidth} y=${Math.round(img.getBoundingClientRect().y)}`, ok: img.naturalWidth > 0 })),
        );
        const broken = imgs.filter((i) => !i.ok);
        t.ok(broken.length === 0, `${path}: ${broken.length} broken of ${imgs.length} images: ${broken.map((b) => b.src).join(" ")}`);
        t.note(`${path}: ${imgs.length} visible images, ${broken.length} broken`);
      }
      await page.goto("/?category=Nope");
      await t.shot("empty-state-illustration");
      const empty = await page.locator("#catalog-empty svg").count();
      t.ok(empty > 0, "empty catalog state has no package illustration");
    },
  },
  {
    id: "C1",
    item: "Catalog page header: title, live count, dispatch chip",
    ref: "R3",
    modes: [
      [390, false],
      [1440, false],
    ],
    run: async (t) => {
      const { page } = t;
      await page.goto("/");
      await ready(page);
      await sleep(900);
      const head = await page.evaluate(() => ({
        h1: document.querySelector("h1")?.textContent?.trim(),
        count: document.querySelector(".live-count")?.textContent?.replace(/\s+/g, " ").trim(),
        chip: document.querySelector(".dispatch")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      }));
      t.ok(head.h1 === "Catalog", `h1 ${head.h1}`);
      t.ok(/^10 parts on the counter$/.test(head.count ?? ""), `count text "${head.count}"`);
      t.ok(!!head.chip, "no dispatch chip");
      t.note(`count "${head.count}", chip "${head.chip}"`);
      await t.shot("top");
    },
  },
  {
    id: "C2",
    item: "Sticky toolbar under the header (pills, filter field, sort menu, List/Grid toggle)",
    ref: "R3",
    modes: [
      [390, false],
      [1440, false],
    ],
    run: async (t) => {
      const { page } = t;
      await page.goto("/");
      await ready(page);
      await sleep(900);
      await t.shot("toolbar-top");
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
        window.scrollTo(0, 600);
      });
      await sleep(400);
      const geo = await page.evaluate(() => {
        const bar = document.querySelector(".toolbar").getBoundingClientRect();
        const header = document.querySelector(".site-header").getBoundingClientRect();
        return { toolbarTop: bar.top, headerBottom: header.bottom };
      });
      t.ok(
        geo.toolbarTop >= geo.headerBottom - 1 && geo.toolbarTop <= geo.headerBottom + 12,
        `toolbar top ${geo.toolbarTop} vs header bottom ${geo.headerBottom}`,
      );
      await t.shot("toolbar-stuck");
      const present = await page.evaluate(() => ({
        pills: !!document.querySelector(".pills"),
        field: !!document.querySelector("#catalog-q"),
        sort: !!document.querySelector("#catalog-sort"),
        toggle: !!document.querySelector("#catalog-view"),
      }));
      t.ok(Object.values(present).every(Boolean), `toolbar parts: ${JSON.stringify(present)}`);
      await page.locator("#catalog-sort summary").click();
      await t.shot("sort-open");
      await page.locator('.sort-menu a[data-sort="price"]').click();
      await sleep(600);
      const url = page.url();
      t.ok(url.includes("sort=price"), `sort not in URL: ${url}`);
      const firstPrice = await page.evaluate(() => {
        const rows = [...document.querySelectorAll("#catalog [data-part]")].filter(
          (el) => el.getBoundingClientRect().width > 0,
        );
        return rows.slice(0, 3).map((r) => r.dataset.part);
      });
      t.note(`sorted by price: first parts ${firstPrice.join(", ")}`);
    },
  },
  {
    id: "C3",
    item: "Filter pills slide (one indicator), rows glide on filter/sort, in-catalog field instant, URL via replaceState, count rolls",
    ref: "R3",
    run: async (t) => {
      const { page } = t;
      await page.goto("/");
      await ready(page);
      await sleep(900);
      await page.evaluate(() => {
        window.__navs = 0;
        window.addEventListener("beforeunload", () => (window.__navs += 1));
      });
      const indicator = { key: "ind", sel: ".pills .indicator", rect: true, anim: true };
      await startSample(page, [indicator, { key: "count", sel: "#catalog-count", text: true }], 700);
      await startVtSample(page, 700);
      await page.locator('.pills a[data-category="Power"]').click();
      const frames = await endSample(page);
      const vt = await endVtSample(page);
      const xs = frames.map((f) => f["ind.x"]);
      const startX = xs[0];
      const endX = xs[xs.length - 1];
      const mid = xs.filter((x) => Math.abs(x - startX) > 2 && Math.abs(x - endX) > 2);
      const animated = Math.max(...frames.map((f) => f["ind.anims"] ?? 0));
      t.note(`indicator x: ${startX} → ${endX}; ${mid.length} intermediate frames; max running animations ${animated} (frames are sparse while a view transition holds rendering)`);
      if (t.reduced) t.ok(mid.length === 0, `indicator animated under reduced motion (${mid.length} mid frames)`);
      else t.ok(mid.length >= 1, `indicator did not slide (${mid.length} mid frames, ${animated} animations)`);
      const pillBox = await page.locator('.pills a[data-category="Power"]').boundingBox();
      const indBox = await page.locator(".pills .indicator").boundingBox();
      t.ok(
        Math.abs(pillBox.x - indBox.x) < 3 && Math.abs(pillBox.width - indBox.width) < 4,
        `indicator ${JSON.stringify(indBox)} not aligned with pill ${JSON.stringify(pillBox)}`,
      );
      const names = vt.map((v) => v.pseudo);
      const groups = names.filter((n) => n.includes("group("));
      t.note(`view-transition pseudos: ${names.slice(0, 8).join(" ")}${names.length > 8 ? " …" : ""}`);
      if (!t.reduced) t.ok(groups.length > 0, "no view transition ran for the filter");
      t.ok(page.url().includes("category=Power"), `URL ${page.url()}`);
      t.ok((await page.evaluate(() => window.__navs)) === 0, "filter caused a page navigation");
      const count = await page.locator("#catalog-count").textContent();
      t.ok(count?.trim() === "3", `count after Power: "${count}"`);
      await t.shot("filtered-power");

      const mids = [];
      await page.evaluate(() => {
        window.__glide = [];
      });
      await startVtSample(page, 900);
      await page.locator("#catalog-sort summary").click();
      await page.locator('.sort-menu a[data-sort="price"]').click();
      await sleep(120);
      mids.push(await page.screenshot({ type: "png" }));
      await sleep(120);
      mids.push(await page.screenshot({ type: "png" }));
      const vt2 = await endVtSample(page);
      const rowGroups = vt2.filter((v) => v.pseudo.includes("group("));
      t.note(`sort: ${rowGroups.length} group animations`);
      if (!t.reduced) t.ok(rowGroups.length >= 2, "rows did not glide on sort (no group animations)");
      await t.sheet("sort-glide", mids);

      await page.locator("#catalog-q").fill("lm");
      await sleep(500);
      const afterField = await page.evaluate(() => ({
        url: location.search,
        count: document.querySelector("#catalog-count")?.textContent,
        navs: window.__navs,
      }));
      t.ok(afterField.url.includes("q=lm"), `field not in URL: ${afterField.url}`);
      t.ok(afterField.navs === 0, "filter field navigated");
      t.note(`field "lm": url ${afterField.url}, count ${afterField.count}`);
      await t.shot("field-lm");
      await page.locator("#catalog-q").fill("zzzz");
      await sleep(500);
      const emptyShown = await page.locator("#catalog-empty").isVisible();
      t.ok(emptyShown, "empty state not shown for no match");
      await t.shot("field-empty");
    },
  },
  {
    id: "C4",
    item: "List / Grid toggle works, photo morphs, choice persists across reload",
    ref: "R3",
    run: async (t) => {
      const { page } = t;
      await page.goto("/");
      await ready(page);
      await page.locator("#catalog-view[data-ready='true']").waitFor();
      await sleep(900);
      const def = await page.locator("#catalog-view [aria-pressed='true']").getAttribute("data-view");
      const expectedDefault = t.vp >= 900 ? "list" : "grid";
      t.ok(def === expectedDefault, `default view ${def}, expected ${expectedDefault}`);
      await t.shot(`default-${def}`);
      const target = def === "list" ? "grid" : "list";
      await startVtSample(page, 800);
      await page.locator(`#catalog-view [data-view="${target}"]`).click();
      await sleep(150);
      await t.shot("mid-morph");
      const vt = await endVtSample(page);
      const photoGroups = vt.filter((v) => v.pseudo.includes("group(") && v.pseudo.includes("part-photo"));
      t.note(`photo morph groups: ${photoGroups.length}`);
      if (!t.reduced) t.ok(photoGroups.length > 0, "photos did not morph between layouts");
      await sleep(600);
      await t.shot(`after-${target}`);
      const stored = await page.evaluate(() => localStorage.getItem("lahore_silicon_catalog_view"));
      t.ok(stored === target, `localStorage ${stored}`);
      await page.reload();
      await ready(page);
      await page.locator("#catalog-view[data-ready='true']").waitFor();
      const pressed = await page.locator("#catalog-view [aria-pressed='true']").getAttribute("data-view");
      t.ok(pressed === target, `after reload pressed ${pressed}`);
      const attr = await page.evaluate(() => document.documentElement.getAttribute("data-catalog-view"));
      t.ok(attr === target, `html attr ${attr}`);
      const visibleLayout = await page.evaluate(() => {
        const vis = (sel) => {
          const el = document.querySelector(sel);
          return !!el && el.getBoundingClientRect().height > 0;
        };
        return { list: vis('[data-layout="list"]'), grid: vis('[data-layout="grid"]') };
      });
      t.ok(
        target === "grid" ? visibleLayout.grid && !visibleLayout.list : visibleLayout.list && !visibleLayout.grid,
        `visible layouts after reload ${JSON.stringify(visibleLayout)}`,
      );
      await t.shot("after-reload");
    },
  },
  {
    id: "C5",
    item: "Grid cards: pointer tilt ≤ 4°, sheen, quick-add rises (fine pointer only)",
    ref: "R3",
    modes: [
      [1440, false],
      [1440, true],
      [390, false],
    ],
    run: async (t) => {
      const { page } = t;
      await page.addInitScript(() => localStorage.setItem("lahore_silicon_catalog_view", "grid"));
      await page.goto("/");
      await ready(page);
      await page.locator("#catalog-view[data-ready='true']").waitFor();
      await sleep(900);
      await t.shot("grid");
      if (t.vp === 390) {
        const card = page.locator('#catalog [data-layout="grid"] .grid-card:visible').first();
        const tilt = await card.evaluate((el) => el.style.getPropertyValue("--rx"));
        const add = await card.locator("button:visible").count();
        t.ok(add > 0, "quick-add not visible on touch");
        t.note(`touch: tilt var "${tilt}", quick-add buttons visible ${add}`);
        return;
      }
      const card = page.locator('#catalog [data-layout="grid"] .grid-card:visible').nth(1);
      await card.scrollIntoViewIfNeeded();
      const box = await card.boundingBox();
      await page.mouse.move(box.x + 6, box.y + 6);
      await sleep(80);
      await page.mouse.move(box.x + 24, box.y + 24, { steps: 4 });
      await sleep(250);
      const probe = await card.evaluate((el) => ({
        rx: el.style.getPropertyValue("--rx"),
        ry: el.style.getPropertyValue("--ry"),
        sx: el.style.getPropertyValue("--sheen-x"),
        hot: el.classList.contains("is-hot"),
        transform: getComputedStyle(el).transform,
      }));
      await t.shot("hover-corner");
      const rx = Number.parseFloat(probe.rx);
      const ry = Number.parseFloat(probe.ry);
      t.note(`hover: ${JSON.stringify(probe)}`);
      if (t.reduced) {
        t.ok(!probe.hot || (Math.abs(rx) < 0.01 && Math.abs(ry) < 0.01), "tilt active under reduced motion");
      } else {
        t.ok(probe.hot, "card did not heat on hover");
        t.ok(Math.abs(rx) > 0.2 || Math.abs(ry) > 0.2, "no tilt applied");
        t.ok(Math.abs(rx) <= 4.01 && Math.abs(ry) <= 4.01, `tilt over 4°: ${rx}, ${ry}`);
      }
      const addBtn = card.locator("button").first();
      const addState = await addBtn.evaluate((el) => {
        const cs = getComputedStyle(el);
        const wrap = el.closest(".quick-add, .grid-add") ?? el;
        return { opacity: getComputedStyle(wrap).opacity, transform: getComputedStyle(wrap).transform };
      });
      t.note(`quick-add: ${JSON.stringify(addState)}`);
      await page.mouse.move(5, 5);
      await sleep(900);
      const after = await card.evaluate((el) => ({
        rx: el.style.getPropertyValue("--rx"),
        ry: el.style.getPropertyValue("--ry"),
        hot: el.classList.contains("is-hot"),
      }));
      t.ok(
        Math.abs(Number.parseFloat(after.rx || "0")) < 0.1 && Math.abs(Number.parseFloat(after.ry || "0")) < 0.1,
        `tilt did not settle: ${JSON.stringify(after)}`,
      );
      await t.shot("after-leave");
    },
  },
  {
    id: "C6",
    item: "List rows: hover lift + chevron; hover preview card follows the pointer at ≥ 1200px, absent below",
    ref: "R3",
    modes: [
      [1440, false],
      [1440, true],
    ],
    run: async (t) => {
      const { page } = t;
      await page.addInitScript(() => localStorage.setItem("lahore_silicon_catalog_view", "list"));
      await page.goto("/");
      await ready(page);
      await sleep(1000);
      const row = page.locator('.cat-table tbody tr[data-part="NE555"]');
      await row.scrollIntoViewIfNeeded();
      const box = await row.locator("td.job").boundingBox();
      await page.mouse.move(box.x + 20, box.y + box.height / 2);
      await sleep(80);
      await page.mouse.move(box.x + 40, box.y + box.height / 2, { steps: 3 });
      await sleep(450);
      const hover = await page.evaluate(() => {
        const tr = document.querySelector('.cat-table tbody tr[data-part="NE555"]');
        const img = tr.querySelector("img");
        const preview = document.querySelector("[data-row-preview]");
        return {
          rowBg: getComputedStyle(tr).backgroundColor,
          imgTransform: img ? getComputedStyle(img.closest(".photo-stage, .thumb, td") ?? img).transform : null,
          chevron: getComputedStyle(tr.querySelector(".row-chevron")).opacity,
          previewOn: preview.classList.contains("is-on"),
          previewPlaced: preview.classList.contains("is-placed"),
          previewTransform: getComputedStyle(preview).transform,
          previewParent: preview.parentElement?.tagName,
        };
      });
      await t.shot("hover-a");
      t.note(`hover: ${JSON.stringify(hover)}`);
      if (t.reduced) {
        t.ok(!hover.previewOn, "preview shown under reduced motion");
        return;
      }
      t.ok(hover.previewOn && hover.previewPlaced, "hover preview card did not appear");
      const before = hover.previewTransform;
      await page.mouse.move(box.x + 260, box.y + box.height / 2, { steps: 12 });
      await sleep(80);
      const trail = await page.evaluate(() => getComputedStyle(document.querySelector("[data-row-preview]")).transform);
      await sleep(600);
      const after = await page.evaluate(() => getComputedStyle(document.querySelector("[data-row-preview]")).transform);
      await t.shot("hover-b");
      t.ok(before !== after, `preview did not follow pointer (${before} → ${after})`);
      t.note(`preview transform ${before} → ${trail} (mid) → ${after}`);
      const cardText = await page.locator("[data-preview-card]").innerText();
      t.ok(/NE555/.test(cardText), `preview card shows wrong part: ${cardText.slice(0, 40)}`);
      await page.mouse.move(5, 5);
      await sleep(400);
      const left = await page.locator("[data-row-preview]").evaluate((el) => el.classList.contains("is-on"));
      t.ok(!left, "preview stayed after leaving the row");

      await page.setViewportSize({ width: 1100, height: 900 });
      await sleep(300);
      const display = await page.locator("[data-row-preview]").evaluate((el) => getComputedStyle(el).display);
      t.ok(display === "none", `preview display at 1100px: ${display}`);
    },
  },
  {
    id: "C7",
    item: "First-visit entrance (title mask, toolbar fade, first 8 rows rise, staggered) and no replay on filter or reload",
    ref: "R3",
    modes: [
      [390, false],
      [1440, false],
      [1440, true],
    ],
    run: async (t) => {
      const { page } = t;
      await page.addInitScript(() => {
        const describe = (el) =>
          el.getAnimations().map((a) => {
            const timing = a.effect.getTiming();
            return {
              name: a.animationName,
              delay: Math.round(Number(timing.delay)),
              dur: Math.round(Number(timing.duration)),
              keys: a.effect.getKeyframes().map((k) => `${k.opacity ?? ""}|${k.transform ?? ""}|${k.clipPath ?? ""}`),
            };
          });
        const poll = () => {
          const title = document.querySelector(".title-rise");
          const toolbar = document.querySelector(".toolbar");
          const items = [...document.querySelectorAll("#catalog [data-part]")].filter(
            (el) => el.getBoundingClientRect().width > 0,
          );
          if (title && toolbar && items.length >= 10 && !window.__entr) {
            window.__entr = {
              title: describe(title),
              toolbar: describe(toolbar),
              rows: items.slice(0, 12).map((el) => describe(el)),
            };
          }
          if (!window.__entr && performance.now() < 4000) requestAnimationFrame(poll);
        };
        poll();
      });
      await page.goto("/");
      await sleep(1700);
      const entr = await page.evaluate(() => window.__entr);
      t.ok(!!entr, "entrance probe never found the catalog");
      if (!entr) return;
      const delays = entr.rows.map((r) => (r[0] ? r[0].delay : null));
      t.note(`title anims ${JSON.stringify(entr.title)}; toolbar ${JSON.stringify(entr.toolbar)}`);
      t.note(`row delays (ms): ${delays.join(", ")}; row anim ${JSON.stringify(entr.rows[0][0] ?? null)}`);
      if (t.reduced) {
        const moving = entr.rows.some((r) => r.some((a) => a.keys.some((k) => /translate|matrix/.test(k))));
        t.ok(!moving, "rows translate under reduced motion");
        t.ok(!entr.title.some((a) => a.keys.some((k) => /translate|matrix|inset|clip/.test(k))), "title moves under reduced motion");
      } else {
        t.ok(entr.title.length > 0, "title has no entrance animation");
        t.ok(entr.title.some((a) => a.keys.some((k) => /translate|matrix/.test(k))), "title does not rise");
        t.ok(entr.toolbar.length > 0, "toolbar has no entrance animation");
        t.ok(delays.slice(0, 8).every((d) => d !== null), "first 8 rows are not all animated");
        const first8 = delays.slice(0, 8);
        t.ok(first8.every((d, i) => i === 0 || d >= first8[i - 1]), `delays not staggered: ${first8.join(",")}`);
        t.ok(first8[7] > first8[0], "row 8 starts no later than row 1");
        t.ok(
          entr.rows[0].some((a) => a.keys.some((k) => /translate|matrix/.test(k)) && a.keys.some((k) => /^0\|/.test(k))),
          "rows do not rise and fade",
        );
      }
      await sleep(400);
      await t.shot("settled");
      const entered = await page.evaluate(() => document.documentElement.classList.contains("catalog-entered"));
      t.ok(entered, "catalog-entered not set after entrance");

      await startSample(page, [{ key: "row", sel: "#catalog [data-part]:not([hidden])", style: ["opacity"] }], 500);
      await page.locator('.pills a[data-category="Boards"]').click();
      const replay = await endSample(page);
      const dips = replay.filter((f) => Number(f["row.opacity"]) < 0.5);
      t.ok(dips.length === 0, `filter replayed the entrance (opacity dips: ${dips.length})`);

      await page.reload();
      await sleep(150);
      const afterReload = await page.evaluate(() => ({
        entered: document.documentElement.classList.contains("catalog-entered"),
        opacity: getComputedStyle(
          [...document.querySelectorAll("#catalog [data-part]")].find((el) => el.getBoundingClientRect().width > 0),
        ).opacity,
      }));
      t.ok(afterReload.entered && afterReload.opacity === "1", `reload replayed: ${JSON.stringify(afterReload)}`);
    },
  },
  {
    id: "C8",
    item: "Arrow keys move between catalog rows, Enter opens the part",
    ref: "R3",
    modes: [
      [1440, false],
      [1440, true],
      [390, false],
    ],
    run: async (t) => {
      const { page } = t;
      if (t.vp === 390) {
        t.skip("rows exist only in the ≥ 900px List table; the narrow layout is Grid cards (touch)");
        return;
      }
      await page.addInitScript(() => localStorage.setItem("lahore_silicon_catalog_view", "list"));
      await page.goto("/");
      await ready(page);
      await sleep(1000);
      const links = page.locator(".cat-table tbody tr.is-linked a.part-link");
      await links.nth(0).focus();
      await page.keyboard.press("ArrowDown");
      const second = await page.evaluate(() => document.activeElement?.textContent?.trim());
      const expectedSecond = await links.nth(1).textContent();
      t.ok(second === expectedSecond?.trim(), `ArrowDown focused "${second}", expected "${expectedSecond?.trim()}"`);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowUp");
      const again = await page.evaluate(() => document.activeElement?.textContent?.trim());
      t.ok(again === expectedSecond?.trim(), `ArrowUp returned to "${again}"`);
      await t.shot("focused-row");
      await page.keyboard.press("Enter");
      await page.waitForURL(/\/product\//);
      t.note(`Enter opened ${page.url()}`);
      await page.goBack();
      await page.locator(".cat-table").waitFor();
    },
  },
];
