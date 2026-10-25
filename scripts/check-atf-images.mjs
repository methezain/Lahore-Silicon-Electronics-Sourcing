/**
 * Median above-the-fold image transfer size from the latest Lighthouse CI results.
 * Run after `lhci autorun`. Exits 1 when a URL is over the budget.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { aboveTheFoldImageBytes, atfImageBytes, median } from "./atf-images.mjs";

const dir = path.resolve(".lighthouseci");
const entries = await readdir(dir).catch(() => []);
const files = entries.filter((name) => name.startsWith("lhr-") && name.endsWith(".json"));
if (files.length === 0) {
  console.error("No Lighthouse results in .lighthouseci. Run lhci autorun first.");
  process.exit(1);
}

/** @type {Map<string, number[]>} */
const byUrl = new Map();
for (const file of files) {
  const lhr = JSON.parse(await readFile(path.join(dir, file), "utf8"));
  const url = typeof lhr.finalUrl === "string" ? lhr.finalUrl : lhr.requestedUrl;
  if (typeof url !== "string") continue;
  const sample = aboveTheFoldImageBytes(lhr);
  const list = byUrl.get(url) ?? [];
  list.push(sample.bytes);
  byUrl.set(url, list);
  console.log(`${url} run ${list.length}: ${sample.bytes} bytes (${sample.count} images)`);
}

let failed = false;
for (const [url, samples] of byUrl) {
  const value = median(samples);
  const ok = value <= atfImageBytes;
  console.log(`${ok ? "pass" : "fail"} ${url} median ${value} bytes (budget ${atfImageBytes})`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
