import { describe, expect, it } from "vitest";
import {
  bentoOrder,
  categoryCounts,
  categoryPhoto,
  keySpec,
  orderedParts,
  partList,
  partNoun,
  pickHeroDeck,
  resolveFeaturedCategory,
  type HomePart,
} from "../../src/lib/home";

const categories = ["Power", "Boards", "ICs", "Sensors", "Relays"] as const;

function part(partNumber: string, category: string, extra: Partial<HomePart> = {}): HomePart {
  return { part_number: partNumber, category, ...extra };
}

const catalog: HomePart[] = [
  part("LM7805", "Power"),
  part("ESP32-WROOM-32D", "Boards", { image: "esp" }),
  part("LM2596S", "Power", { featured: true, image: "lm" }),
  part("ARDUINO-NANO", "Boards", { image: "nano" }),
  part("NE555", "ICs"),
  part("AMS1117-3.3", "Power"),
  part("HC-SR04", "Sensors", { image: "sr" }),
  part("DS18B20", "Sensors"),
  part("TCRT5000", "Sensors"),
  part("SRD-05VDC-SL-C", "Relays"),
];

describe("home selection", () => {
  it("orders by the category list, then part number", () => {
    const numbers = orderedParts(catalog, categories).map((item) => item.part_number);
    expect(numbers.slice(0, 5)).toEqual([
      "AMS1117-3.3",
      "LM2596S",
      "LM7805",
      "ARDUINO-NANO",
      "ESP32-WROOM-32D",
    ]);
  });

  it("counts only categories that have parts", () => {
    expect(categoryCounts(catalog, [...categories, "Passives"])).toEqual([
      { category: "Power", count: 3 },
      { category: "Boards", count: 2 },
      { category: "ICs", count: 1 },
      { category: "Sensors", count: 3 },
      { category: "Relays", count: 1 },
    ]);
  });

  it("puts the featured category first and the largest jobs beside it", () => {
    const order = bentoOrder(categoryCounts(catalog, categories), categories, "Boards").map((row) => row.category);
    expect(order).toEqual(["Boards", "Power", "Sensors", "ICs", "Relays"]);
  });

  it("keeps the preferred category when it still has parts", () => {
    expect(resolveFeaturedCategory(catalog, categories, "Boards")).toBe("Boards");
  });

  it("falls back to the largest category, and keeps the earlier tie", () => {
    const withoutBoards = catalog.filter((item) => item.category !== "Boards");
    expect(resolveFeaturedCategory(withoutBoards, categories, "Boards")).toBe("Power");
  });

  it("puts the featured part in front and the featured category behind it", () => {
    const deck = pickHeroDeck(catalog, categories, "Boards");
    expect(deck?.front.part_number).toBe("LM2596S");
    expect(deck?.behind.map((item) => item.part_number)).toEqual(["ARDUINO-NANO", "ESP32-WROOM-32D"]);
  });

  it("uses catalog order when no part is featured", () => {
    const plain = catalog.map(({ featured: _featured, ...item }) => item);
    const deck = pickHeroDeck(plain, categories, "Boards");
    expect(deck?.front.part_number).toBe("AMS1117-3.3");
    expect(deck?.behind.map((item) => item.part_number)).toEqual(["ARDUINO-NANO", "ESP32-WROOM-32D"]);
  });

  it("fills the deck from the rest of the catalog when the feature category is thin", () => {
    const deck = pickHeroDeck(catalog, categories, "Relays");
    expect(deck?.behind.map((item) => item.part_number)).toEqual(["SRD-05VDC-SL-C", "AMS1117-3.3"]);
  });

  it("returns null for an empty counter", () => {
    expect(pickHeroDeck([], categories, "Boards")).toBeNull();
  });

  it("uses the named photo when that part is in the category", () => {
    expect(categoryPhoto(catalog, "Boards", categories, "ESP32-WROOM-32D")?.part_number).toBe("ESP32-WROOM-32D");
  });

  it("skips a named photo that has no image", () => {
    const bare = catalog.map((item) =>
      item.part_number === "ESP32-WROOM-32D" ? { ...item, image: undefined } : item,
    );
    expect(categoryPhoto(bare, "Boards", categories, "ESP32-WROOM-32D")?.part_number).toBe("ARDUINO-NANO");
  });

  it("lists part numbers without inventing a sentence", () => {
    expect(partList(["ARDUINO-NANO", "ESP32-WROOM-32D"])).toBe("ARDUINO-NANO and ESP32-WROOM-32D");
    expect(partList(["NE555"])).toBe("NE555");
    expect(partList(["A", "B", "C"])).toBe("A, B and C");
    expect(partNoun(1)).toBe("part");
    expect(partNoun(2)).toBe("parts");
  });

  it("prefers the voltage line for the key spec", () => {
    expect(keySpec({ voltage: "3.3 V", package_type: "SOT-223" })).toBe("3.3 V");
    expect(keySpec({ voltage: "  ", package_type: "TO-92" })).toBe("TO-92");
  });
});
