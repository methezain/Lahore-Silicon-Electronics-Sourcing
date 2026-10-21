import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aboveTheFoldImageBytes, atfImageBytes, median } from "../../scripts/atf-images.mjs";

describe("above-the-fold images", () => {
  it("sums high-priority image transfer bytes and ignores lazy images", () => {
    const lhr = {
      audits: {
        "network-requests": {
          details: {
            items: [
              { url: "https://shop.test/hero.avif", resourceType: "Image", priority: "High", transferSize: 40_000 },
              { url: "https://shop.test/lazy.avif", resourceType: "Image", priority: "Low", transferSize: 80_000 },
              { url: "https://shop.test/app.js", resourceType: "Script", priority: "High", transferSize: 20_000 },
            ],
          },
        },
        "largest-contentful-paint-element": { details: { items: [] } },
      },
    };
    expect(aboveTheFoldImageBytes(lhr)).toMatchObject({ bytes: 40_000, count: 1 });
    expect(atfImageBytes).toBe(120 * 1024);
  });

  it("includes the LCP image even when its priority is missing", () => {
    const url = "https://shop.test/lcp.avif";
    const lhr = {
      audits: {
        "network-requests": {
          details: {
            items: [{ url, resourceType: "Image", transferSize: 12_000 }],
          },
        },
        "largest-contentful-paint-element": { snippet: `<img src="${url}">` },
      },
    };
    expect(aboveTheFoldImageBytes(lhr).bytes).toBe(12_000);
  });

  it("uses the median run", () => {
    expect(median([300, 100, 200])).toBe(200);
    expect(median([10, 40])).toBe(25);
  });
});

describe("lighthouse ci budgets", () => {
  it("asserts the mobile lab budgets in bytes", () => {
    const config = JSON.parse(readFileSync("lighthouserc.json", "utf8")) as {
      ci: {
        collect: { numberOfRuns: number; url: string[] };
        assert: {
          assertions: Record<string, [string, { maxNumericValue: number; aggregationMethod: string }]>;
          assertMatrix: { matchingUrlPattern: string; assertions: Record<string, [string, { maxNumericValue: number }]> }[];
        };
      };
    };
    expect(config.ci.collect.numberOfRuns).toBe(5);
    expect(config.ci.collect.url).toEqual([
      "http://127.0.0.1:4322/",
      "http://127.0.0.1:4322/product/lm7805",
    ]);
    const shared = config.ci.assert.assertMatrix.find((row) => row.matchingUrlPattern === ".*");
    const product = config.ci.assert.assertMatrix.find((row) => row.matchingUrlPattern.includes("product"));
    expect(shared).toBeTruthy();
    const assertions = shared?.assertions ?? {};
    expect(assertions["largest-contentful-paint"][1]).toMatchObject({ maxNumericValue: 2000, aggregationMethod: "median" });
    expect(assertions["total-blocking-time"][1].maxNumericValue).toBe(150);
    expect(assertions["cumulative-layout-shift"][1].maxNumericValue).toBe(0.05);
    expect(assertions["resource-summary:document:size"][1].maxNumericValue).toBe(30 * 1024);
    expect(assertions["resource-summary:stylesheet:size"][1].maxNumericValue).toBe(35 * 1024);
    expect(assertions["resource-summary:font:size"][1].maxNumericValue).toBe(120 * 1024);
    expect(assertions["resource-summary:font:count"][1].maxNumericValue).toBe(2);
    expect(assertions["resource-summary:third-party:count"][1].maxNumericValue).toBe(0);
    expect(product?.assertions["resource-summary:script:size"][1].maxNumericValue).toBe(45 * 1024);
  });
});
