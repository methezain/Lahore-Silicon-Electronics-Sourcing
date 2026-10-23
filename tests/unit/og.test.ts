import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ogPath } from "../../src/lib/og";

const dir = path.resolve("src/content/components");

describe("share images", () => {
  it("maps a part number to its own image and falls back to the default", () => {
    expect(ogPath("AMS1117-3.3")).toBe("/og/ams1117-3-3.png");
    expect(ogPath()).toBe("/og/default.png");
  });

  it("has a generated image for every catalog part", () => {
    for (const name of readdirSync(dir).filter((file) => file.endsWith(".json"))) {
      const { part_number } = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
      expect(existsSync(path.resolve("public", `.${ogPath(part_number)}`)), part_number).toBe(true);
    }
    expect(existsSync(path.resolve("public/og/default.png"))).toBe(true);
  });
});
