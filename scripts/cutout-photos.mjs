/**
 * Local background removal for the ten studio photographs.
 * Original JPEGs in src/assets/parts stay untouched.
 *
 * The sweep is a smooth grey field. A quadratic fit of the border, in OKLab,
 * is that field. The part is grown from pixels that are clearly not the sweep
 * (color, a dark body, a hard edge). Growth does not step into the soft floor
 * shadow. Anything the sweep cannot reach from the frame edge, except a small
 * mounting hole, stays in the cut-out.
 *
 * Writes a transparent cut-out at 1024 (2×) and 512 (1×), AVIF and WebP.
 * Set CUTOUT=lm7805,esp32 to process a subset.
 */
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("src/assets/parts");
const outDir = path.join(root, "cutouts");
const previewDir = path.resolve("test-results/v5-photo/cutout-preview");
const SIZE = 1024;
const HALF = 512;
const BORDER = 36;

const only = new Set(
  (process.env.CUTOUT ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean),
);

function srgbToLinear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(channel) {
  const c = Math.min(1, Math.max(0, channel));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function rgbToOklab(r, g, b) {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function solve(matrix, vector) {
  const n = vector.length;
  const a = matrix.map((row, i) => [...row, vector[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const div = a[col][col] || 1e-12;
    for (let j = col; j <= n; j += 1) a[col][j] /= div;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = col; j <= n; j += 1) a[row][j] -= factor * a[col][j];
    }
  }
  return a.map((row) => row[n]);
}

function fieldAt(coeff, x, y) {
  const phi = [x * x, y * y, x * y, x, y, 1];
  let value = 0;
  for (let i = 0; i < 6; i += 1) value += coeff[i] * phi[i];
  return value;
}

function fitBorder(lab, width, height) {
  const coeffs = [];
  const samples = [];
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      if (x >= BORDER && x < width - BORDER && y >= BORDER && y < height - BORDER) continue;
      const i = (y * width + x) * 3;
      samples.push([x / (width - 1), y / (height - 1), lab[i], lab[i + 1], lab[i + 2]]);
    }
  }
  for (let channel = 0; channel < 3; channel += 1) {
    const ata = Array.from({ length: 6 }, () => Array(6).fill(0));
    const atb = Array(6).fill(0);
    for (const sample of samples) {
      const [x, y] = sample;
      const phi = [x * x, y * y, x * y, x, y, 1];
      const value = sample[2 + channel];
      for (let i = 0; i < 6; i += 1) {
        atb[i] += phi[i] * value;
        for (let j = 0; j < 6; j += 1) ata[i][j] += phi[i] * phi[j];
      }
    }
    coeffs.push(solve(ata, atb));
  }
  return coeffs;
}

function buildMask(lab, width, height, coeffs) {
  const count = width * height;
  const gradient = new Float32Array(count);
  const deltaE = new Float32Array(count);
  const deltaC = new Float32Array(count);
  const deltaL = new Float32Array(count);
  const foreground = new Uint8Array(count);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      gradient[i] = Math.hypot(lab[(i + 1) * 3] - lab[(i - 1) * 3], lab[(i + width) * 3] - lab[(i - width) * 3]);
    }
  }

  for (let y = 0; y < height; y += 1) {
    const ny = y / (height - 1);
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      const nx = x / (width - 1);
      const dL = lab[i * 3] - fieldAt(coeffs[0], nx, ny);
      const dC = Math.hypot(lab[i * 3 + 1] - fieldAt(coeffs[1], nx, ny), lab[i * 3 + 2] - fieldAt(coeffs[2], nx, ny));
      deltaL[i] = dL;
      deltaC[i] = dC;
      deltaE[i] = Math.hypot(dL, dC);
      const shadow = dC < 0.018 && dL < -0.045 && dL > -0.22 && gradient[i] < 0.06;
      const part = dC > 0.02 || dL < -0.13 || gradient[i] > 0.06;
      if (part && !shadow) foreground[i] = 1;
    }
  }

  const stack = [];
  for (let i = 0; i < count; i += 1) if (foreground[i]) stack.push(i);
  while (stack.length) {
    const i = stack.pop();
    const x = i % width;
    const y = (i - x) / width;
    const neighbors = [];
    if (x > 0) neighbors.push(i - 1);
    if (x + 1 < width) neighbors.push(i + 1);
    if (y > 0) neighbors.push(i - width);
    if (y + 1 < height) neighbors.push(i + width);
    for (const n of neighbors) {
      if (foreground[n]) continue;
      const shadow = deltaC[n] < 0.018 && deltaL[n] < -0.045 && deltaL[n] > -0.22 && gradient[n] < 0.06;
      const part = deltaC[n] > 0.016 || deltaL[n] < -0.1 || gradient[n] > 0.055;
      if (part && !shadow) {
        foreground[n] = 1;
        stack.push(n);
      }
    }
  }

  const outside = new Uint8Array(count);
  const edge = [];
  const pushOutside = (i) => {
    if (outside[i] || foreground[i]) return;
    outside[i] = 1;
    edge.push(i);
  };
  for (let x = 0; x < width; x += 1) {
    pushOutside(x);
    pushOutside((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    pushOutside(y * width);
    pushOutside(y * width + width - 1);
  }
  while (edge.length) {
    const i = edge.pop();
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) pushOutside(i - 1);
    if (x + 1 < width) pushOutside(i + 1);
    if (y > 0) pushOutside(i - width);
    if (y + 1 < height) pushOutside(i + width);
  }
  for (let i = 0; i < count; i += 1) {
    if (!outside[i]) foreground[i] = 1;
  }

  const hole = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) {
    if (deltaE[i] < 0.012 && deltaC[i] < 0.008 && gradient[i] < 0.02) hole[i] = 1;
  }
  const seen = new Uint8Array(count);
  const walk = [];
  for (let start = 0; start < count; start += 1) {
    if (!hole[start] || seen[start] || outside[start]) continue;
    walk.length = 0;
    walk.push(start);
    seen[start] = 1;
    const component = [start];
    let open = false;
    while (walk.length) {
      const i = walk.pop();
      const x = i % width;
      const y = (i - x) / width;
      const neighbors = [i - 1, i + 1, i - width, i + width];
      for (const n of neighbors) {
        if (n < 0 || n >= count) continue;
        const nx = n % width;
        if (Math.abs(nx - x) + Math.abs((n - nx) / width - y) !== 1) continue;
        if (outside[n]) open = true;
        if (seen[n] || !hole[n]) continue;
        seen[n] = 1;
        walk.push(n);
        component.push(n);
      }
    }
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    for (const i of component) {
      const x = i % width;
      const y = (i - x) / width;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const round = Math.min(bw, bh) / Math.max(bw, bh) > 0.55;
    const filled = component.length / (bw * bh) > 0.4;
    if (!open && round && filled && component.length > 60 && component.length < 9000) {
      for (const i of component) foreground[i] = 0;
    }
  }

  let kept = foreground;
  for (let pass = 0; pass < 2; pass += 1) kept = erode(kept, width, height);
  return kept;
}

function erode(src, width, height) {
  const out = new Uint8Array(src.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      if (!src[i] || !src[i - 1] || !src[i + 1] || !src[i - width] || !src[i + width]) continue;
      out[i] = 1;
    }
  }
  return out;
}

function bleed(rgba, mask, width, height) {
  const source = Buffer.from(rgba);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (mask[i]) continue;
      let copied = false;
      for (let r = 1; r <= 2 && !copied; r += 1) {
        for (let dy = -r; dy <= r && !copied; dy += 1) {
          const yy = y + dy;
          if (yy < 0 || yy >= height) continue;
          for (let dx = -r; dx <= r; dx += 1) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const xx = x + dx;
            if (xx < 0 || xx >= width || !mask[yy * width + xx]) continue;
            const from = (yy * width + xx) * 4;
            const to = i * 4;
            rgba[to] = source[from];
            rgba[to + 1] = source[from + 1];
            rgba[to + 2] = source[from + 2];
            copied = true;
            break;
          }
        }
      }
    }
  }
}

function feather(mask, width, height) {
  const alpha = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          const weight = dx === 0 && dy === 0 ? 4 : dx === 0 || dy === 0 ? 2 : 1;
          sum += (mask[yy * width + xx] ? 255 : 0) * weight;
          n += weight;
        }
      }
      alpha[y * width + x] = Math.round(sum / n);
    }
  }
  return alpha;
}

async function cutFile(file, gain) {
  const { data, info } = await sharp(path.join(root, file))
    .resize(SIZE, SIZE, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const lab = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i += 1) {
    const [L, A, B] = rgbToOklab(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    lab[i * 3] = L;
    lab[i * 3 + 1] = A;
    lab[i * 3 + 2] = B;
  }
  const mask = buildMask(lab, width, height, fitBorder(lab, width, height));
  const rgba = Buffer.from(data);
  bleed(rgba, mask, width, height);
  const alpha = feather(mask, width, height);
  let opaque = 0;
  let lSum = 0;
  for (let i = 0; i < width * height; i += 1) {
    const base = i * 4;
    const a = alpha[i];
    if (a < 12) {
      rgba[base] = 0;
      rgba[base + 1] = 0;
      rgba[base + 2] = 0;
      rgba[base + 3] = 0;
      continue;
    }
    rgba[base + 3] = a;
    if (gain !== 1 && a > 200) {
      rgba[base] = Math.round(Math.min(255, Math.max(0, linearToSrgb(srgbToLinear(rgba[base]) * gain) * 255)));
      rgba[base + 1] = Math.round(Math.min(255, Math.max(0, linearToSrgb(srgbToLinear(rgba[base + 1]) * gain) * 255)));
      rgba[base + 2] = Math.round(Math.min(255, Math.max(0, linearToSrgb(srgbToLinear(rgba[base + 2]) * gain) * 255)));
    }
    if (a > 200) {
      opaque += 1;
      lSum += lab[i * 3];
    }
  }
  if (opaque < 1000) throw new Error(`${file}: cut-out was empty`);

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3] < 20) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  minX = Math.max(0, minX - 2);
  minY = Math.max(0, minY - 2);
  maxX = Math.min(width - 1, maxX + 2);
  maxY = Math.min(height - 1, maxY + 2);
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const cropped = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .png()
    .toBuffer();
  const side = Math.max(cropW, cropH);
  const square = await sharp({
    create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: cropped, left: Math.floor((side - cropW) / 2), top: Math.floor((side - cropH) / 2) }])
    .png()
    .toBuffer();
  const sized = await sharp(square).resize(SIZE, SIZE, { fit: "fill" }).png().toBuffer();
  return { file, square: sized, meanL: lSum / opaque };
}

const files = (await readdir(root))
  .filter((name) => name.endsWith(".jpg") && (only.size === 0 || only.has(name.replace(/\.jpg$/, ""))))
  .sort();

await mkdir(outDir, { recursive: true });
await mkdir(previewDir, { recursive: true });

const first = [];
for (const file of files) first.push(await cutFile(file, 1));
const lights = first.map((row) => row.meanL).sort((a, b) => a - b);
const target = lights[Math.floor(lights.length / 2)] || 0.5;

for (const row of first) {
  const gain = Math.min(1.06, Math.max(0.94, target / (row.meanL || target)));
  const cut = Math.abs(gain - 1) < 0.01 ? row : await cutFile(row.file, gain);
  const stem = row.file.replace(/\.jpg$/, "");
  const master = cut.square;
  await sharp(master).webp({ quality: 86, alphaQuality: 100, effort: 4 }).toFile(path.join(outDir, `${stem}.webp`));
  await sharp(master).avif({ quality: 62, effort: 4 }).toFile(path.join(outDir, `${stem}.avif`));
  await sharp(master).resize(HALF, HALF).webp({ quality: 82, alphaQuality: 100, effort: 4 }).toFile(path.join(outDir, `${stem}-1x.webp`));
  await sharp(master).resize(HALF, HALF).avif({ quality: 58, effort: 4 }).toFile(path.join(outDir, `${stem}-1x.avif`));
  const light = await sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: { r: 243, g: 246, b: 250 } },
  })
    .composite([{ input: master }])
    .png()
    .toBuffer();
  const dark = await sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: { r: 30, g: 36, b: 48 } },
  })
    .composite([{ input: master }])
    .png()
    .toBuffer();
  await sharp({
    create: { width: SIZE * 2, height: SIZE, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite([
      { input: light, left: 0, top: 0 },
      { input: dark, left: SIZE, top: 0 },
    ])
    .jpeg({ quality: 80 })
    .toFile(path.join(previewDir, `${stem}.jpg`));
  console.log(`${stem} meanL ${row.meanL.toFixed(3)} gain ${gain.toFixed(3)}`);
}
