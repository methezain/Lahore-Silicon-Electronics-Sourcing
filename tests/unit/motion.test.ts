import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  distanceRise,
  durationMs,
  durationSec,
  easings,
  prefersReducedMotion,
  springs,
  staggerDelay,
  staggerMax,
  staggerMs,
} from "../../src/lib/motion";
import { pressSelector } from "../../src/lib/press";

const css = readFileSync("src/styles/tokens.css", "utf8");

describe("motion tokens", () => {
  it("mirrors the durations and easings in tokens.css", () => {
    expect(css).toContain("--dur-instant: 80ms");
    expect(css).toContain("--dur-fast: 140ms");
    expect(css).toContain("--dur-base: 220ms");
    expect(css).toContain("--dur-slow: 360ms");
    expect(css).toContain("--dur-page: 420ms");
    expect(css).toContain("--ease-out: cubic-bezier(0.22, 1, 0.36, 1)");
    expect(css).toContain("--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)");
    expect(css).toContain("--ease-exit: cubic-bezier(0.4, 0, 1, 1)");
    expect(durationMs).toEqual({ instant: 80, fast: 140, base: 220, slow: 360, page: 420 });
    expect(durationSec.instant).toBe(0.08);
    expect(easings.out).toEqual([0.22, 1, 0.36, 1]);
    expect(easings.inOut).toEqual([0.65, 0, 0.35, 1]);
    expect(easings.exit).toEqual([0.4, 0, 1, 1]);
  });

  it("mirrors the spring, stagger and rise presets", () => {
    expect(css).toContain("--spring-snappy-stiffness: 520");
    expect(css).toContain("--spring-snappy-damping: 42");
    expect(css).toContain("--spring-snappy-mass: 1");
    expect(css).toContain("--spring-smooth-duration: 0.4s");
    expect(css).toContain("--spring-smooth-bounce: 0");
    expect(css).toContain("--spring-flick-duration: 0.45s");
    expect(css).toContain("--spring-flick-bounce: 0.18");
    expect(css).toContain("--stagger: 30ms");
    expect(css).toContain("--stagger-max: 8");
    expect(css).toContain("--distance-rise: 12px");
    expect(springs.snappy).toEqual({ stiffness: 520, damping: 42, mass: 1 });
    expect(springs.smooth).toEqual({ visualDuration: 0.4, bounce: 0 });
    expect(springs.flick).toEqual({ visualDuration: 0.45, bounce: 0.18 });
    expect(staggerMs).toBe(30);
    expect(staggerMax).toBe(8);
    expect(distanceRise).toBe(12);
  });

  it("staggers at most eight items", () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(7)).toBe(0.21);
    expect(staggerDelay(8)).toBe(0.21);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("presses buttons, pills, cards and rows", () => {
    expect(pressSelector).toContain("button");
    expect(pressSelector).toContain(".pills a");
    expect(pressSelector).toContain("article.card");
    expect(pressSelector).toContain("tr.is-linked");
    expect(pressSelector).toContain("[data-press]");
  });
});
