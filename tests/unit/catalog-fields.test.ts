import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

type Spec = { label: string; value: string; unit?: string };
type Pin = { pin: string; label: string; note?: string };
type Part = {
  part_number: string;
  summary: string;
  key_specs: string[];
  specs: Spec[];
  logic_level?: string;
  pinout?: Pin[];
  companions?: string[];
  faq?: { q: string; a: string }[];
  datasheet?: string;
  images?: { src: string; alt: string; note?: string }[];
  shelf_qty?: number;
  restock_on?: string;
};

const LABELS = new Set([
  "Output voltage",
  "Output current",
  "Input voltage",
  "Supply voltage",
  "Typical dropout",
  "Package",
  "Mounting",
  "Regulator",
  "Logic voltage",
  "Radio",
  "Processor",
  "Flash",
  "Microcontroller",
  "3.3 V pin",
  "Digital I/O",
  "Analog inputs",
  "USB connector",
  "Clock",
  "Function",
  "Pin count",
  "Modes",
  "Interface",
  "Temperature range",
  "Temperature accuracy",
  "Address",
  "Sensing distance",
  "Distance accuracy",
  "Ultrasonic frequency",
  "Sensor",
  "Outputs",
  "Sensitivity",
  "Coil voltage",
  "Channels",
  "Contact rating",
  "Trigger",
  "Input circuit",
  "Relay",
]);

const LOGIC = new Set(["3.3 V", "5 V", "3.3 V and 5 V"]);

async function loadParts(): Promise<Part[]> {
  const dir = path.resolve("src/content/components");
  const files = (await readdir(dir)).filter((name) => name.endsWith(".json"));
  return Promise.all(
    files.map(async (file) => JSON.parse(await readFile(path.join(dir, file), "utf8")) as Part),
  );
}

describe("catalog fields", () => {
  it("keeps summaries, key specs, labels, and companions provable", async () => {
    const parts = await loadParts();
    expect(parts).toHaveLength(10);
    const numbers = new Set(parts.map((part) => part.part_number));

    for (const part of parts) {
      expect(part.summary.length, part.part_number).toBeGreaterThan(0);
      expect(part.summary.length, part.part_number).toBeLessThanOrEqual(160);
      expect(part.key_specs.length, part.part_number).toBeGreaterThanOrEqual(2);
      expect(part.key_specs.length, part.part_number).toBeLessThanOrEqual(4);
      const labels = part.specs.map((spec) => spec.label);
      expect(new Set(labels).size, part.part_number).toBe(labels.length);
      for (const label of labels) expect(LABELS.has(label), `${part.part_number} ${label}`).toBe(true);
      for (const label of part.key_specs) expect(labels, part.part_number).toContain(label);
      if (part.logic_level) expect(LOGIC.has(part.logic_level), part.part_number).toBe(true);
      if (part.faq) {
        expect(part.faq.length, part.part_number).toBeGreaterThanOrEqual(3);
        expect(part.faq.length, part.part_number).toBeLessThanOrEqual(6);
      }
      for (const companion of part.companions ?? []) {
        expect(companion, part.part_number).not.toBe(part.part_number);
        expect(numbers.has(companion), `${part.part_number} -> ${companion}`).toBe(true);
      }
      if (part.datasheet) {
        const url = new URL(part.datasheet);
        expect(url.protocol, part.part_number).toBe("https:");
        expect(part.datasheet.includes("#"), part.part_number).toBe(false);
      }
      expect(part.shelf_qty, part.part_number).toBeUndefined();
      expect(part.restock_on, part.part_number).toBeUndefined();
    }
  });
});
