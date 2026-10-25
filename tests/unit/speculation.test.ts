import { describe, expect, it } from "vitest";
import { speculationRules } from "../../src/lib/speculation";

describe("speculation rules", () => {
  it("prerenders product pages at moderate eagerness and leaves checkout and api out", () => {
    const rules = JSON.parse(speculationRules) as {
      prerender: { eagerness: string; where: { and: { href_matches?: string; not?: { href_matches?: string } }[] } }[];
    };
    expect(rules.prerender).toHaveLength(1);
    const rule = rules.prerender[0];
    expect(rule.eagerness).toBe("moderate");
    const patterns = rule.where.and.map((item) => item.href_matches ?? item.not?.href_matches);
    expect(patterns).toContain("/product/*");
    expect(patterns).toContain("/checkout");
    expect(patterns).toContain("/api");
    expect(patterns).toContain("/api/*");
  });
});
