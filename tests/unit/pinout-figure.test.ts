import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PIN_ORDER_CAVEAT, pinFigure, type PinoutPin } from "../../src/lib/pinout-figure";

type PartFile = {
  part_number: string;
  package_type: string;
  specs: { label: string; value: string }[];
  pinout?: PinoutPin[];
  companions?: string[];
};

const partsDir = path.resolve("src/content/components");
const parts: PartFile[] = readdirSync(partsDir)
  .filter((name) => name.endsWith(".json"))
  .map((name) => JSON.parse(readFileSync(path.join(partsDir, name), "utf8")) as PartFile);

function part(partNumber: string): PartFile {
  const found = parts.find((item) => item.part_number === partNumber);
  if (!found) throw new Error(`Missing ${partNumber}`);
  return found;
}

function figureFor(item: PartFile) {
  const connector = item.specs.find((spec) => spec.label === "USB connector")?.value;
  return pinFigure({
    packageType: item.package_type,
    pins: item.pinout ?? [],
    ...(connector ? { connector } : {}),
  });
}

function mark(figure: ReturnType<typeof pinFigure>, pin: string) {
  const found = figure.marks.filter((item) => item.pin === pin);
  expect(found.length, pin).toBeGreaterThan(0);
  return found;
}

describe("pin figures use the listing and standard package geometry", () => {
  it("places every listed pin and only listed companions", () => {
    const numbers = new Set(parts.map((item) => item.part_number));
    for (const item of parts) {
      for (const companion of item.companions ?? []) {
        expect(numbers.has(companion), `${item.part_number} companion ${companion}`).toBe(true);
      }
      if (!item.pinout) continue;
      const figure = figureFor(item);
      const placed = new Set(figure.marks.map((pin) => pin.pin));
      for (const pin of item.pinout) {
        expect(placed.has(pin.pin), `${item.part_number} ${pin.pin}`).toBe(true);
      }
    }
  });

  it("draws LM7805 pins 1–3 left to right and does not name the tab", () => {
    const figure = figureFor(part("LM7805"));
    const [first, second, third] = ["1", "2", "3"].map((pin) => mark(figure, pin)[0]);
    expect(first.x).toBeLessThan(second.x);
    expect(second.x).toBeLessThan(third.x);
    expect(first.y).toBe(second.y);
    expect(figure.caveat).toBeUndefined();
    expect(figure.marks.some((pin) => pin.wide)).toBe(false);
  });

  it("draws the 555 as a DIP with pin 1 at the top left and pin 8 at the top right", () => {
    const figure = figureFor(part("NE555"));
    const pin1 = mark(figure, "1")[0];
    const pin4 = mark(figure, "4")[0];
    const pin8 = mark(figure, "8")[0];
    expect(pin1.y).toBe(pin8.y);
    expect(pin1.x).toBeLessThan(pin8.x);
    expect(pin4.y).toBeGreaterThan(pin1.y);
    expect(figure.caveat).toBeUndefined();
  });

  it("follows the ESP32-WROOM-32D top view and skips pin 39", () => {
    const figure = figureFor(part("ESP32-WROOM-32D"));
    const pin1 = mark(figure, "1")[0];
    const pin14 = mark(figure, "14")[0];
    const pin15 = mark(figure, "15")[0];
    const pin24 = mark(figure, "24")[0];
    const pin25 = mark(figure, "25")[0];
    const pin38 = mark(figure, "38")[0];
    expect(pin1.y).toBeCloseTo(pin38.y);
    expect(pin1.x).toBeLessThan(pin38.x);
    expect(pin14.y).toBeGreaterThan(pin1.y);
    expect(pin15.y).toBeGreaterThan(pin14.y);
    expect(pin15.x).toBeLessThan(pin24.x);
    expect(pin25.y).toBeGreaterThan(pin38.y);
    expect(figure.marks.some((pin) => pin.pin === "39")).toBe(false);
    expect(figure.caveat).toBeUndefined();
  });

  it("places Nano headers with USB at the top and duplicates pins the note names twice", () => {
    const item = part("ARDUINO-NANO");
    const figure = figureFor(item);
    const d13 = mark(figure, "D13")[0];
    const d12 = mark(figure, "D12")[0];
    const vin = mark(figure, "VIN")[0];
    expect(d13.y).toBeCloseTo(d12.y);
    expect(d13.x).toBeLessThan(d12.x);
    expect(vin.y).toBeGreaterThan(d13.y);
    expect(mark(figure, "GND")).toHaveLength(2);
    expect(mark(figure, "RESET")).toHaveLength(2);
    expect(figure.connector?.text).toBe("Mini-B");
    expect(figure.caveat).toBeUndefined();
  });

  it("lights the SOT-223 tab from the pin whose note names it", () => {
    const figure = figureFor(part("AMS1117-3.3"));
    const tab = mark(figure, "2")[0];
    expect(tab.wide).toBeDefined();
    expect(mark(figure, "1")[0].wide).toBeUndefined();
  });

  it("does not claim a left-to-right order the listing does not give", () => {
    const figure = figureFor(part("HC-SR04"));
    const [vcc, trig, echo, gnd] = ["VCC", "Trig", "Echo", "GND"].map((pin) => mark(figure, pin)[0]);
    expect(vcc.x).toBeLessThan(trig.x);
    expect(trig.x).toBeLessThan(echo.x);
    expect(echo.x).toBeLessThan(gnd.x);
    expect(figure.caveat).toBe(PIN_ORDER_CAVEAT);
  });
});
