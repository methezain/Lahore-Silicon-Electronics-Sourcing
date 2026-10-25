/**
 * Above-the-fold image budget from a Lighthouse result.
 * High-priority images, plus any image URL named by the LCP element.
 * docs/engineering.md#performance-budgets — ≤ 120 KB compressed.
 */

export const atfImageBytes = 120 * 1024;

/** @param {any} lhr */
export function aboveTheFoldImageBytes(lhr) {
  const items = lhr.audits?.["network-requests"]?.details?.items ?? [];
  const lcpSnippet = JSON.stringify(lhr.audits?.["largest-contentful-paint-element"] ?? {});
  /** @type {{ url: string, transferSize: number }[]} */
  const chosen = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (item);
    const type = String(row.resourceType ?? "");
    const mime = String(row.mimeType ?? "");
    const image = type === "Image" || type === "image" || mime.startsWith("image/");
    if (!image) continue;
    const url = String(row.url ?? "");
    const priority = String(row.priority ?? "");
    const high = priority === "High" || priority === "VeryHigh";
    const lcp = url.length > 0 && lcpSnippet.includes(url);
    if (!high && !lcp) continue;
    chosen.push({ url, transferSize: Number(row.transferSize) || 0 });
  }
  const bytes = chosen.reduce((sum, row) => sum + row.transferSize, 0);
  return { bytes, count: chosen.length, urls: chosen.map((row) => row.url) };
}

/** @param {number[]} values */
export function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}
