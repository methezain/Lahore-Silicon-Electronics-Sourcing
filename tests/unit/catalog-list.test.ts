import { describe, expect, it } from "vitest";
import {
  ENTRANCE_STAGGER_MS,
  entranceBootScript,
  entranceDelay,
  lerp,
  LIST_ENTERED_KEY,
  placePreview,
  PREVIEW_DELAY_MS,
  PREVIEW_LERP,
  rowStep,
  shouldPlayEntrance,
} from "../../src/lib/catalog-list";

describe("catalog list motion", () => {
  it("staggers the first 8 rows and holds the rest with them", () => {
    expect(entranceDelay(0)).toBe(0);
    expect(entranceDelay(1)).toBe(ENTRANCE_STAGGER_MS);
    expect(entranceDelay(7)).toBe(7 * ENTRANCE_STAGGER_MS);
    expect(entranceDelay(8)).toBe(7 * ENTRANCE_STAGGER_MS);
    expect(entranceDelay(20)).toBe(entranceDelay(7));
  });

  it("moves between rows with the arrow keys and stops at the ends", () => {
    expect(rowStep(0, "ArrowUp", 10)).toBeNull();
    expect(rowStep(0, "ArrowLeft", 10)).toBeNull();
    expect(rowStep(0, "ArrowDown", 10)).toBe(1);
    expect(rowStep(0, "ArrowRight", 10)).toBe(1);
    expect(rowStep(4, "ArrowUp", 10)).toBe(3);
    expect(rowStep(4, "ArrowLeft", 10)).toBe(3);
    expect(rowStep(9, "ArrowDown", 10)).toBeNull();
    expect(rowStep(9, "ArrowRight", 10)).toBeNull();
    expect(rowStep(-1, "ArrowDown", 10)).toBeNull();
    expect(rowStep(0, "Enter", 10)).toBeNull();
  });

  it("keeps the preview card off the pointer and inside the viewport", () => {
    const card = { width: 320, height: 180 };
    const viewport = { width: 1440, height: 900 };
    const gap = 16;
    const near = placePreview(120, 240, card, viewport, gap);
    expect(near).toEqual({ x: 136, y: 256 });
    expect(near.x).toBeGreaterThan(120);

    const edge = placePreview(1400, 860, card, viewport, gap);
    expect(edge.x + card.width).toBeLessThanOrEqual(viewport.width - gap);
    expect(edge.y + card.height).toBeLessThanOrEqual(viewport.height - gap);
    expect(edge.x + card.width).toBeLessThanOrEqual(1400 - gap);
    expect(edge.y + card.height).toBeLessThanOrEqual(860 - gap);
  });

  it("follows with a 0.18 lerp and waits 150ms to open", () => {
    expect(PREVIEW_LERP).toBe(0.18);
    expect(lerp(0, 100, PREVIEW_LERP)).toBeCloseTo(18);
    expect(PREVIEW_DELAY_MS).toBe(150);
  });

  it("plays the list entrance once, and only while the list is on screen", () => {
    expect(shouldPlayEntrance(false, true)).toBe(true);
    expect(shouldPlayEntrance(true, true)).toBe(false);
    expect(shouldPlayEntrance(false, false)).toBe(false);
    expect(entranceBootScript).toContain(LIST_ENTERED_KEY);
    expect(entranceBootScript).toContain("dataset.listEnter");
    expect(entranceBootScript).toContain("min-width: 900px");
  });
});
