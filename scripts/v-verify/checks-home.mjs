import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { sleep } from "./harness.mjs";

const stockOf = () => {
  const dir = "src/content/components";
  const out = {};
  for (const f of readdirSync(dir)) {
    const d = JSON.parse(readFileSync(join(dir, f), "utf8"));
    out[d.part_number] = d.stock_qty;
  }
  return out;
};

export const homeChecks = [
  {
    id: "H1",
    item: "/home hero: masked headline lines, chip, card deck fans in, grid lines draw once, deck tilt and spotlight follow the pointer",
    ref: "R7",
    run: async (t) => {
      const { page } = t;
      await page.addInitScript(() => {
        const describe = (el) =>
          el.getAnimations().map((a) => {
            const timing = a.effect.getTiming();
            return `${a.animationName}@${Math.round(Number(timing.delay))}+${Math.round(Number(timing.duration))}`;
          });
        const poll = () => {
          const rises = [...document.querySelectorAll(".mask .rise")];
          const status = document.querySelector(".status");
          const cards = [...document.querySelectorAll(".deck .back, .deck .front")];
          const lines = [...document.querySelectorAll(".grid-lines path")];
          if (rises.length && status && !window.__hero) {
            window.__hero = {
              rises: rises.map(describe),
              status: describe(status),
              cards: cards.map(describe),
              lines: lines.map(describe).slice(0, 3),
              lineCount: lines.length,
            };
          }
          if (!window.__hero && performance.now() < 4000) requestAnimationFrame(poll);
        };
        poll();
      });
      await page.goto("/home", { waitUntil: "commit" });
      await page.locator(".home-hero .rise").first().waitFor({ state: "attached" });
      const early = [];
      for (let i = 0; i < 6; i += 1) {
        early.push(await page.screenshot({ type: "png" }));
        await sleep(90);
      }
      await t.sheet("load-frames", early);
      await sleep(1800);
      const hero = await page.evaluate(() => window.__hero);
      t.ok(!!hero, "hero probe found nothing");
      if (!hero) return;
      t.note(`rises ${JSON.stringify(hero.rises)}; status ${JSON.stringify(hero.status)}; cards ${JSON.stringify(hero.cards)}; lines(${hero.lineCount}) ${JSON.stringify(hero.lines)}`);
      await t.shot("settled");
      if (t.reduced) {
        const all = [...hero.rises.flat(), ...hero.status, ...hero.cards.flat(), ...hero.lines.flat()];
        t.ok(all.every((a) => /fade|none/i.test(a) || a === ""), `animations under reduced motion: ${all.join(" ")}`);
        t.ok((await page.locator(".spot").evaluate((el) => getComputedStyle(el).display)) === "none", "spotlight visible under reduced motion");
        return;
      }
      const delays = hero.rises.map((r) => parseFloat((r[0] ?? "@-1").split("@")[1]));
      t.ok(hero.rises.length >= 2 && hero.rises.every((r) => r.length > 0), "headline lines are not animated");
      t.ok(delays.every((d, i) => i === 0 || d > delays[i - 1]), `headline not staggered: ${delays.join(",")}`);
      t.ok(hero.status.length > 0, "status chip does not animate in");
      t.ok(hero.lineCount > 0 && hero.lines.every((l) => l.some((a) => /900/.test(a))), `grid lines should draw over 900 ms: ${JSON.stringify(hero.lines)}`);
      if (t.vp >= 900) {
        t.ok(hero.cards.length >= 3 && hero.cards.every((c) => c.length > 0), "deck cards do not animate in");
        const cd = hero.cards.map((c) => parseFloat((c[0] ?? "@-1").split("@")[1]));
        t.ok(new Set(cd).size > 1, `deck cards not staggered: ${cd.join(",")}`);
        const box = await page.locator(".home-hero").boundingBox();
        const readTilt = () =>
          page.evaluate(() => ({
            rx: document.querySelector(".deck-tilt")?.dataset.rx,
            ry: document.querySelector(".deck-tilt")?.dataset.ry,
            sx: document.querySelector(".home-hero")?.dataset.sx,
            sy: document.querySelector(".home-hero")?.dataset.sy,
            spot: getComputedStyle(document.querySelector(".spot")).opacity,
          }));
        await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.2, { steps: 5 });
        await sleep(700);
        const a = await readTilt();
        await t.shot("pointer-a");
        await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.8, { steps: 8 });
        await sleep(700);
        const b = await readTilt();
        await t.shot("pointer-b");
        t.note(`tilt A ${JSON.stringify(a)} B ${JSON.stringify(b)}`);
        t.ok(a.rx !== b.rx || a.ry !== b.ry, "deck tilt did not follow the pointer");
        t.ok(a.sx !== b.sx || a.sy !== b.sy, "spotlight position did not follow the pointer");
        t.ok(Math.abs(Number(a.rx)) <= 6 && Math.abs(Number(b.ry)) <= 6, "tilt exceeds 6°");
      } else {
        t.note("deck and spotlight are pointer features and are hidden on touch widths");
      }
    },
  },
  {
    id: "H2",
    item: "/home story: scroll-driven reveals, package illustrations assemble, process connector line draws with scroll",
    ref: "R7",
    run: async (t) => {
      const { page } = t;
      await page.goto("/home");
      await sleep(1500);
      const support = await page.evaluate(() => CSS.supports("animation-timeline: view()"));
      t.note(`animation-timeline supported in this Chromium: ${support}`);
      const probe = () =>
        page.evaluate(() => {
          const at = (sel) => document.querySelector(sel);
          const cs = (sel, p) => (at(sel) ? getComputedStyle(at(sel))[p] : null);
          return {
            y: Math.round(scrollY),
            reveal: cs("#story", "opacity"),
            revealTl: cs("#story", "animationTimeline"),
            piece: [...document.querySelectorAll(".piece")]
              .map((p) => `${Number(getComputedStyle(p).opacity).toFixed(2)}/${getComputedStyle(p).transform === "none" ? "none" : "moved"}`)
              .join(" "),
            dash: [...document.querySelectorAll(".connector path")].map((p) => parseFloat(getComputedStyle(p).strokeDashoffset).toFixed(2)).join(","),
          };
        });
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
      });
      const frames = [];
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      const viewport = t.vp < 900 ? 844 : 900;
      for (let y = 0; y < total - viewport; y += Math.round(viewport / 4)) {
        await page.evaluate((v) => window.scrollTo(0, v), y);
        await sleep(160);
        frames.push(await probe());
        if (frames.length % 4 === 0) await t.shot(`scroll-${String(frames.length).padStart(2, "0")}`);
      }
      t.note(`${frames.length} scroll samples; first ${JSON.stringify(frames[0])}; mid ${JSON.stringify(frames[Math.floor(frames.length / 2)])}`);
      if (t.reduced) {
        t.ok(frames.every((f) => f.revealTl === "auto" || f.revealTl === "none"), "scroll timelines under reduced motion");
        t.ok(frames.every((f) => f.reveal === "1"), "story not fully visible with reduced motion");
        return;
      }
      if (!support) {
        t.skip("animation-timeline unsupported here");
        return;
      }
      t.ok(frames.some((f) => /view/.test(f.revealTl ?? "")), `#story uses a view timeline: ${frames[0]?.revealTl}`);
      const partials = frames.filter((f) => f.reveal !== null && Number(f.reveal) > 0.02 && Number(f.reveal) < 0.98);
      t.ok(partials.length > 0, "story reveal never caught between 0 and 1");
      const pieceProg = new Set(frames.map((f) => f.piece));
      t.ok(pieceProg.size > 2, `package pieces did not assemble with scroll (${pieceProg.size} distinct states)`);
      const dashes = new Set(frames.map((f) => f.dash));
      t.ok(dashes.size > 2, `connector line did not draw with scroll (${[...dashes].join(" | ")})`);
    },
  },
  {
    id: "H3",
    item: "/home content: live stock strip matches the catalog, trust facts, closing CTA, footer wordmark; no horizontal overflow",
    ref: "R7",
    modes: [
      [390, false],
      [1440, false],
    ],
    run: async (t) => {
      const { page } = t;
      await page.goto("/home");
      await sleep(1500);
      await page.evaluate(async () => {
        document.documentElement.style.scrollBehavior = "auto";
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 70));
        }
      });
      await sleep(500);
      await t.shot("full", { options: { fullPage: true } });
      const stock = stockOf();
      const shown = await page.locator("#stock a").evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, " ")).filter((x) => /in stock/.test(x)));
      t.note(`stock strip: ${shown.join(" | ")}`);
      const mismatched = shown.filter((text) => {
        const part = Object.keys(stock).find((p) => text.includes(p));
        const m = /(\d+) in stock/.exec(text);
        return !part || !m || Number(m[1]) !== stock[part];
      });
      t.ok(shown.length >= 4, `stock strip rows ${shown.length}`);
      t.ok(mismatched.length === 0, `stock counts differ from the catalog: ${mismatched.join(" | ")}`);
      t.ok((await page.locator("a", { hasText: "Open the catalog" }).count()) > 0, "closing CTA missing");
      t.ok((await page.locator(".footer-wordmark").innerText()) === "Lahore Silicon", "footer wordmark missing");
      const facts = await page.locator(".facts").first().innerText();
      t.ok(/1 business day/.test(facts) && /48–72 hours/.test(facts), `trust facts "${facts.replace(/\s+/g, " ")}"`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      t.ok(overflow <= 1, `overflow ${overflow}`);
    },
  },
];
