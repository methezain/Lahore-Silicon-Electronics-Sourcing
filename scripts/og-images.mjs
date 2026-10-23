/**
 * Share images and app icons, drawn from the real catalog and the brand fonts.
 * Writes public/og/*.png, public/favicon.svg, favicon.ico, apple-touch-icon.png,
 * icon-192.png, icon-512.png and site.webmanifest. Skips work when scripts/og-images.lock matches.
 * Run `node scripts/og-images.mjs --force` after changing the catalog or this file.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = process.cwd();
const catalogDir = path.join(root, "src/content/components");
const fontDir = path.join(root, "src/assets/fonts");
const publicDir = path.join(root, "public");
const ogDir = path.join(publicDir, "og");
const lockFile = path.join(root, "scripts/og-images.lock");
const force = process.argv.includes("--force");

const COLOR = {
  canvas: "#F3F6FA",
  surface: "#FFFFFF",
  line: "#E1E7EE",
  ink: "#0C1D32",
  muted: "#4A5D73",
  navy: "#0C1D32",
  signal: "#20B7FE",
  action: "#047AAD",
  onNavy: "#F1F6FA",
  onNavyMuted: "#A3B3C4",
};
const SHOP = "Lahore Silicon";
const TAGLINE = "Electronic components from Hall Road, Lahore";
const PLUG =
  "M20 12h6v40h-6v-6h-.5A14 14 0 0 1 6 34H3v-4h3a14 14 0 0 1 13.5-12H20zm6 10.5h-4a2.5 2.5 0 0 0 0 5h4zm0 14h-4a2.5 2.5 0 0 0 0 5h4zM38 12h6v6h.5A14 14 0 0 1 58 30h3v4h-3a14 14 0 0 1-13.5 12H44v6h-6zm-6 10.5a2.5 2.5 0 0 0 0 5h6v-5zm0 14a2.5 2.5 0 0 0 0 5h6v-5z";

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (value) => String(value).replace(/[&<>"]/g, (c) => ESCAPES[c]);
const slug = (partNumber) => partNumber.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const pkr = (value) => `PKR ${value.toLocaleString("en-US")}`;
const dataUri = (mime, buffer) => `data:${mime};base64,${buffer.toString("base64")}`;

async function loadParts() {
  const names = (await readdir(catalogDir)).filter((name) => name.endsWith(".json")).sort();
  const parts = [];
  for (const name of names) {
    const raw = await readFile(path.join(catalogDir, name), "utf8");
    const data = JSON.parse(raw);
    const image = data.images?.[0]?.src;
    const imagePath = image ? path.resolve(catalogDir, image) : null;
    parts.push({ data, raw, imagePath: imagePath && existsSync(imagePath) ? imagePath : null });
  }
  return parts;
}

async function fingerprint(parts) {
  const hash = createHash("sha256");
  hash.update(await readFile(new URL(import.meta.url)));
  for (const part of parts) {
    hash.update(part.raw);
    if (part.imagePath) hash.update(await readFile(part.imagePath));
  }
  for (const name of ["mona-sans-latin.woff2", "geist-mono-latin.woff2"]) {
    hash.update(await readFile(path.join(fontDir, name)));
  }
  return hash.digest("hex");
}

function outputsExist(parts) {
  const files = [
    "og/default.png",
    "favicon.svg",
    "favicon.ico",
    "apple-touch-icon.png",
    "icon-192.png",
    "icon-512.png",
    "site.webmanifest",
    ...parts.map((part) => `og/${slug(part.data.part_number)}.png`),
  ];
  return files.every((file) => existsSync(path.join(publicDir, file)));
}

function fontCss(mona, geist) {
  return `
@font-face { font-family: "Mona"; src: url(${dataUri("font/woff2", mona)}) format("woff2"); font-weight: 200 900; font-stretch: 75% 125%; }
@font-face { font-family: "Geist"; src: url(${dataUri("font/woff2", geist)}) format("woff2"); font-weight: 100 900; }`;
}

const baseCss = `
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; overflow: hidden; background: ${COLOR.canvas}; color: ${COLOR.ink}; font-family: "Mona", sans-serif; -webkit-font-smoothing: antialiased; }
.brand { display: flex; align-items: center; gap: 14px; font-size: 28px; font-weight: 600; font-stretch: 108%; letter-spacing: -0.01em; }
.brand svg { width: 44px; height: 44px; color: ${COLOR.action}; }
`;

function plugSvg() {
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="${PLUG}"/></svg>`;
}

function partHtml(part, image, fonts) {
  const { data } = part;
  const facts = [data.manufacturer, data.package_type, data.category].filter(Boolean).map(esc);
  return `<!doctype html><meta charset="utf-8"><style>${fonts}${baseCss}
.card { width: 1200px; height: 630px; padding: 64px; display: grid; grid-template-columns: 1fr 440px; gap: 48px; }
.copy { display: flex; flex-direction: column; justify-content: space-between; min-width: 0; }
.pn { margin-top: 56px; font-family: "Geist", monospace; font-size: 30px; font-weight: 500; letter-spacing: -0.01em; color: ${COLOR.action}; font-variant-numeric: slashed-zero; }
h1 { margin-top: 16px; font-size: 60px; line-height: 1.06; font-weight: 620; font-stretch: 110%; letter-spacing: -0.03em; text-wrap: balance; }
.facts { margin-top: 24px; font-size: 24px; color: ${COLOR.muted}; }
.price { font-size: 56px; font-weight: 600; font-stretch: 108%; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.where { margin-top: 8px; font-size: 22px; color: ${COLOR.muted}; }
.stage { align-self: stretch; display: grid; place-items: center; border-radius: 28px; background: ${COLOR.surface}; box-shadow: inset 0 0 0 1px ${COLOR.line}; }
.stage img { width: 360px; height: 360px; object-fit: contain; }
.stage .mark { width: 160px; color: ${COLOR.action}; }
</style>
<div class="card">
  <div class="copy">
    <div>
      <div class="brand">${plugSvg()}<span>${SHOP}</span></div>
      <p class="pn">${esc(data.part_number)}</p>
      <h1>${esc(data.name)}</h1>
      <p class="facts">${facts.join(" · ")}</p>
    </div>
    <div>
      <p class="price">${pkr(data.price)}</p>
      <p class="where">Hall Road, Lahore. Ships across Pakistan.</p>
    </div>
  </div>
  <div class="stage">${image ? `<img src="${image}" alt="">` : `<span class="mark">${plugSvg()}</span>`}</div>
</div>`;
}

function defaultHtml(fonts) {
  return `<!doctype html><meta charset="utf-8"><style>${fonts}${baseCss}
body { background: ${COLOR.navy}; color: ${COLOR.onNavy}; }
.card { width: 1200px; height: 630px; padding: 72px; display: flex; flex-direction: column; justify-content: space-between; }
.brand svg { color: ${COLOR.signal}; }
h1 { max-width: 920px; font-size: 88px; line-height: 1; font-weight: 640; font-stretch: 112%; letter-spacing: -0.035em; text-wrap: balance; }
h1 em { font-style: normal; color: ${COLOR.signal}; }
.foot { font-size: 26px; color: ${COLOR.onNavyMuted}; }
</style>
<div class="card">
  <div class="brand">${plugSvg()}<span>${SHOP}</span></div>
  <h1>Electronic components from <em>Hall Road</em>, Lahore</h1>
  <p class="foot">Regulators, boards, sensors, ICs and relays. Ships across Pakistan.</p>
</div>`;
}

function iconHtml(size) {
  const pad = Math.round(size * 0.2);
  return `<!doctype html><meta charset="utf-8"><style>
* { margin: 0; } body { width: ${size}px; height: ${size}px; background: ${COLOR.navy}; display: grid; place-items: center; }
svg { width: ${size - pad * 2}px; height: ${size - pad * 2}px; color: ${COLOR.signal}; }
</style>${plugSvg()}`;
}

function icoFromPng(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + pngs.length * 16;
  const entries = pngs.map(({ size, buffer }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buffer.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((png) => png.buffer)]);
}

const parts = await loadParts();
const lock = await fingerprint(parts);
const previous = existsSync(lockFile) ? (await readFile(lockFile, "utf8")).trim() : "";
if (!force && previous === lock && outputsExist(parts)) {
  console.log("og-images: up to date");
  process.exit(0);
}

const [mona, geist] = await Promise.all([
  readFile(path.join(fontDir, "mona-sans-latin.woff2")),
  readFile(path.join(fontDir, "geist-mono-latin.woff2")),
]);
const fonts = fontCss(mona, geist);
await mkdir(ogDir, { recursive: true });

const browser = await chromium.launch();
try {
  const shoot = async (html, size, file) => {
    const [width, height] = size;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    });
    const buffer = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width, height } });
    await page.close();
    if (file) await writeFile(file, buffer);
    return buffer;
  };

  await shoot(defaultHtml(fonts), [1200, 630], path.join(ogDir, "default.png"));
  for (const part of parts) {
    const image = part.imagePath ? dataUri("image/webp", await readFile(part.imagePath)) : null;
    await shoot(partHtml(part, image, fonts), [1200, 630], path.join(ogDir, `${slug(part.data.part_number)}.png`));
  }

  await shoot(iconHtml(180), [180, 180], path.join(publicDir, "apple-touch-icon.png"));
  await shoot(iconHtml(192), [192, 192], path.join(publicDir, "icon-192.png"));
  await shoot(iconHtml(512), [512, 512], path.join(publicDir, "icon-512.png"));
  const ico = [];
  for (const size of [16, 32, 48]) ico.push({ size, buffer: await shoot(iconHtml(size), [size, size]) });
  await writeFile(path.join(publicDir, "favicon.ico"), icoFromPng(ico));
} finally {
  await browser.close();
}

await writeFile(
  path.join(publicDir, "favicon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${COLOR.navy}"/><g transform="translate(9.6 9.6) scale(0.7)"><path fill="${COLOR.signal}" d="${PLUG}"/></g></svg>\n`,
);
await writeFile(
  path.join(publicDir, "site.webmanifest"),
  `${JSON.stringify(
    {
      name: SHOP,
      short_name: SHOP,
      description: TAGLINE,
      start_url: "/",
      display: "browser",
      background_color: COLOR.canvas,
      theme_color: COLOR.canvas,
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    null,
    2,
  )}\n`,
);
await writeFile(lockFile, `${lock}\n`);
console.log(`og-images: wrote ${parts.length + 1} share images and the icon set`);
