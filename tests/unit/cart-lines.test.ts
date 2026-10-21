import { describe, expect, it } from "vitest";
import { reconcileRows, type LineRow } from "../../src/components/cart-lines";

function ids(rows: readonly LineRow[]): string[] {
  return rows.map((row) => row.part_number);
}

describe("cart line phases", () => {
  it("staggers lines when the sheet opens and caps the delay at six", () => {
    const rows = reconcileRows([], ["a", "b", "c", "d", "e", "f", "g", "h"], false);
    expect(rows.map((row) => row.phase)).toEqual(Array(8).fill("enter"));
    expect(rows.map((row) => row.index)).toEqual([0, 1, 2, 3, 4, 5, 5, 5]);
  });

  it("slides a removed line, then grows it if it returns", () => {
    const open = reconcileRows([], ["LM7805", "ESP32-WROOM-32D"], false).map((row) => ({
      ...row,
      phase: "idle" as const,
    }));
    const leaving = reconcileRows(open, ["LM7805"], false);
    expect(leaving.find((row) => row.part_number === "ESP32-WROOM-32D")?.phase).toBe("slide");
    const back = reconcileRows(leaving, ["LM7805", "ESP32-WROOM-32D"], false);
    expect(back.find((row) => row.part_number === "ESP32-WROOM-32D")?.phase).toBe("grow");
    expect(ids(back)).toEqual(["LM7805", "ESP32-WROOM-32D"]);
  });

  it("drops a removed line immediately when motion is reduced", () => {
    const open = reconcileRows([], ["LM7805"], true);
    expect(open[0]?.phase).toBe("idle");
    expect(reconcileRows(open, [], true)).toEqual([]);
  });

  it("keeps the morphing line full height", () => {
    const open = reconcileRows([], ["LM7805"], false).map((row) => ({ ...row, phase: "idle" as const }));
    const next = reconcileRows(open, ["LM7805", "AMS1117-3.3"], false, "AMS1117-3.3");
    expect(next.find((row) => row.part_number === "AMS1117-3.3")?.phase).toBe("enter");
  });

  it("grows a line added while the sheet is already open", () => {
    const open = reconcileRows([], ["LM7805"], false).map((row) => ({ ...row, phase: "idle" as const }));
    const next = reconcileRows(open, ["LM7805", "AMS1117-3.3"], false);
    expect(next.find((row) => row.part_number === "AMS1117-3.3")?.phase).toBe("grow");
  });
});
