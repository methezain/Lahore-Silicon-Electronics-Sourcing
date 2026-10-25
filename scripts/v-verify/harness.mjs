import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

export const BASE = "http://localhost:4321";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const OUT = join(root, "docs", "reports", "v-verify");
export const SHOT_REL = "docs/reports/v-verify";
const RESULTS = join(OUT, "results.json");
mkdirSync(OUT, { recursive: true });

export function contextOptions(vp, reduced) {
  const reducedMotion = reduced ? "reduce" : "no-preference";
  if (vp === 390) {
    return {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      reducedMotion,
    };
  }
  return { viewport: { width: vp, height: 900 }, reducedMotion };
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function startSample(page, specs, ms) {
  await page.evaluate(
    ({ specs, ms }) => {
      window.__sample = new Promise((resolve) => {
        const out = [];
        const t0 = performance.now();
        const read = () => {
          const row = { t: Math.round(performance.now() - t0) };
          for (const spec of specs) {
            const k = spec.key;
            if (spec.count) {
              row[`${k}.count`] = document.querySelectorAll(spec.count).length;
              continue;
            }
            const el = document.querySelector(spec.sel);
            if (!el) {
              row[`${k}.missing`] = true;
              continue;
            }
            const cs = getComputedStyle(el);
            for (const p of spec.style || []) row[`${k}.${p}`] = cs[p];
            if (spec.rect) {
              const r = el.getBoundingClientRect();
              row[`${k}.x`] = Math.round(r.x * 10) / 10;
              row[`${k}.y`] = Math.round(r.y * 10) / 10;
              row[`${k}.w`] = Math.round(r.width * 10) / 10;
              row[`${k}.h`] = Math.round(r.height * 10) / 10;
            }
            for (const a of spec.attrs || []) row[`${k}@${a}`] = el.getAttribute(a);
            if (spec.anim) row[`${k}.anims`] = el.getAnimations().length;
            if (spec.cls) row[`${k}.cls`] = el.className;
            if (spec.text) row[`${k}.text`] = el.textContent.trim().slice(0, 60);
            for (const v of spec.vars || []) row[`${k}.${v}`] = el.style.getPropertyValue(v) || cs.getPropertyValue(v);
          }
          return row;
        };
        const tick = () => {
          out.push(read());
          if (performance.now() - t0 < ms) requestAnimationFrame(tick);
          else resolve(out);
        };
        tick();
      });
    },
    { specs, ms },
  );
}

export async function endSample(page) {
  return page.evaluate(() => window.__sample);
}

export async function startVtSample(page, ms) {
  await page.evaluate((ms) => {
    window.__vt = new Promise((resolve) => {
      const seen = new Map();
      const t0 = performance.now();
      const tick = () => {
        const t = Math.round(performance.now() - t0);
        for (const a of document.getAnimations()) {
          const pseudo = a.effect && a.effect.pseudoElement;
          if (!pseudo) continue;
          const entry = seen.get(pseudo) || { first: t, count: 0, name: a.animationName || "" };
          entry.count += 1;
          seen.set(pseudo, entry);
        }
        if (t < ms) requestAnimationFrame(tick);
        else resolve([...seen.entries()].map(([pseudo, v]) => ({ pseudo, ...v })));
      };
      tick();
    });
  }, ms);
}

export async function endVtSample(page) {
  return page.evaluate(() => window.__vt);
}

export async function stats(buffer) {
  const s = await sharp(buffer).stats();
  const mean = s.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3;
  const std = s.channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0) / 3;
  return { mean: Math.round(mean * 10) / 10, std: Math.round(std * 10) / 10 };
}

export async function contactSheet(buffers, path, cell = 360) {
  const tiles = await Promise.all(
    buffers.map((b) => sharp(b).resize({ width: cell }).png().toBuffer()),
  );
  const metas = await Promise.all(tiles.map((b) => sharp(b).metadata()));
  const height = Math.max(...metas.map((m) => m.height ?? 0));
  const composite = tiles.map((input, i) => ({ input, left: i * (cell + 4), top: 0 }));
  await sharp({
    create: {
      width: tiles.length * (cell + 4),
      height,
      channels: 3,
      background: { r: 200, g: 40, b: 200 },
    },
  })
    .composite(composite)
    .png()
    .toFile(path);
}

export async function touchDrag(page, from, to, ms = 300, steps = 10) {
  const client = await page.context().newCDPSession(page);
  const point = (x, y) => [{ x, y, id: 1 }];
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(from.x, from.y) });
  for (let i = 1; i <= steps; i += 1) {
    await sleep(ms / steps);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: point(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps),
    });
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await client.detach();
}

export function loadResults() {
  if (!existsSync(RESULTS)) return {};
  return JSON.parse(readFileSync(RESULTS, "utf8"));
}

export function saveResults(data) {
  writeFileSync(RESULTS, JSON.stringify(data, null, 2));
}

export async function runChecks(defs, only) {
  const browser = await chromium.launch();
  const results = loadResults();
  for (const def of defs) {
    if (only.length && !only.includes(def.id)) continue;
    const modes = def.modes ?? [
      [390, false],
      [1440, false],
      [390, true],
      [1440, true],
    ];
    results[def.id] = { id: def.id, item: def.item, ref: def.ref, runs: {} };
    for (const [vp, reduced] of modes) {
      const key = `${vp}${reduced ? "-rm" : ""}`;
      const context = await browser.newContext({ ...contextOptions(vp, reduced), baseURL: BASE });
      await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
      const page = await context.newPage();
      const fails = [];
      const notes = [];
      const shots = [];
      let na = null;
      const t = {
        page,
        context,
        browser,
        vp,
        reduced,
        key,
        ok(cond, msg) {
          if (!cond) fails.push(msg);
        },
        note(msg) {
          notes.push(msg);
        },
        skip(msg) {
          na = msg;
        },
        async shot(label, opts = {}) {
          const file = `${def.id}-${key}-${label}.png`;
          await (opts.target ?? page).screenshot({ path: join(OUT, file), ...opts.options });
          shots.push(`${SHOT_REL}/${file}`);
          return file;
        },
        async sheet(label, buffers) {
          const file = `${def.id}-${key}-${label}.png`;
          await contactSheet(buffers, join(OUT, file), vp === 390 ? 200 : 300);
          shots.push(`${SHOT_REL}/${file}`);
          return file;
        },
      };
      const started = Date.now();
      try {
        await def.run(t);
      } catch (error) {
        fails.push(`threw: ${String(error.message).split("\n")[0]}`);
        await t.shot("error").catch(() => {});
      }
      results[def.id].runs[key] = {
        status: na ? "n/a" : fails.length ? "fail" : "pass",
        fails,
        notes: na ? [na, ...notes] : notes,
        shots,
        ms: Date.now() - started,
      };
      console.log(
        `${def.id.padEnd(4)} ${key.padEnd(8)} ${results[def.id].runs[key].status.toUpperCase().padEnd(5)} ${fails.join(" | ")}`,
      );
      await context.close();
    }
    saveResults(results);
  }
  await browser.close();
}
