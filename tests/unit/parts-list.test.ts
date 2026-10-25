import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { encodeCartParam, parseCartParam, cartParamToText, cartHref, cartWhatsAppText } from "../../src/lib/cart-link";
import {
  addLabel,
  limitNote,
  looksLikePartsList,
  parsePartsList,
  previewSummary,
  resolvePartsList,
  type PartsSource,
} from "../../src/lib/parts-list";
import { highlightMatch } from "../../src/lib/search-highlight";

function catalog(): PartsSource[] {
  return readdirSync("src/content/components")
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const data = JSON.parse(readFileSync(`src/content/components/${name}`, "utf8")) as {
        part_number: string;
        mpn: string;
        name: string;
        price: number;
        stock_qty: number;
        min_qty: number;
        qty_multiple: number;
        package_type: string;
      };
      return {
        part_number: data.part_number,
        mpn: data.mpn,
        name: data.name,
        price: data.price,
        stock_qty: data.stock_qty,
        min_qty: data.min_qty,
        qty_multiple: data.qty_multiple,
        package_type: data.package_type,
      };
    });
}

function parsed(line: string) {
  const rows = parsePartsList(line);
  expect(rows).toHaveLength(1);
  return rows[0];
}

describe("parsePartsList formats", () => {
  const cases: Array<[string, string, number]> = [
    ["LM7805 x10", "LM7805", 10],
    ["LM7805 x 10", "LM7805", 10],
    ["LM7805x10", "LM7805", 10],
    ["NE555, 5", "NE555", 5],
    ["NE555,5", "NE555", 5],
    ["ams1117 3.3 - 20", "ams1117 3.3", 20],
    ["ams1117 3.3 – 20", "ams1117 3.3", 20],
    ["10x NE555", "NE555", 10],
    ["10 x LM7805", "LM7805", 10],
    ["LM7805: 10", "LM7805", 10],
    ["LM7805 (10)", "LM7805", 10],
    ["LM7805\t4", "LM7805", 4],
    ["LM7805 × 3", "LM7805", 3],
    ["2 * DS18B20", "DS18B20", 2],
    ["ESP32-WROOM-32D 2pcs", "ESP32-WROOM-32D", 2],
    ["HC-SR04; 6", "HC-SR04", 6],
    ["10 pcs TCRT5000", "TCRT5000", 10],
    ["1. LM2596S x2", "LM2596S", 2],
    ["- ARDUINO-NANO x 1", "ARDUINO-NANO", 1],
    ["5, NE555", "NE555", 5],
    ["SRD-05VDC-SL-C [3]", "SRD-05VDC-SL-C", 3],
    ['"LM7805" x 4', "LM7805", 4],
    ["10. LM7805", "LM7805", 10],
    ["LM7805 qty 8", "LM7805", 8],
    ["LM7805 qty: 8", "LM7805", 8],
  ];

  it.each(cases)("%s → %s × %i", (line, query, quantity) => {
    const row = parsed(line);
    expect(row.query).toBe(query);
    expect(row.quantity).toBe(quantity);
    expect(row.explicit).toBe(true);
  });

  it("keeps a code with an internal x as one part", () => {
    const row = parsed("MAX232");
    expect(row.query).toBe("MAX232");
    expect(row.quantity).toBe(1);
    expect(row.explicit).toBe(false);
  });

  it("drops blanks, comments, and a column header", () => {
    const rows = parsePartsList("# skip\n\nPart, Qty\n// note\nLM7805 x2\n");
    expect(rows.map((row) => row.query)).toEqual(["LM7805"]);
    expect(rows[0]?.quantity).toBe(2);
  });

  it("treats two bare part numbers as a list", () => {
    expect(looksLikePartsList("LM7805")).toBe(false);
    expect(looksLikePartsList("LM7805 x10")).toBe(true);
    expect(looksLikePartsList("lm 7805")).toBe(false);
    expect(looksLikePartsList("lm 7805\nne555 10")).toBe(true);
    expect(looksLikePartsList("LM7805\nNE555")).toBe(true);
  });
});

describe("resolvePartsList against the catalog", () => {
  const parts = catalog();

  it("matches the three pasted examples and misses a part the shop does not sell", () => {
    const result = resolvePartsList("LM7805 x10\nNE555, 5\nams1117 3.3 - 20\nTIP120 x2", parts);
    expect(result.matches.map((match) => [match.part_number, match.quantity])).toEqual([
      ["LM7805", 10],
      ["NE555", 5],
      ["AMS1117-3.3", 20],
    ]);
    expect(result.matches.every((match) => match.message === undefined)).toBe(true);
    expect(result.misses.map((miss) => miss.query)).toEqual(["TIP120"]);
  });

  it("ranks lm 7805 with odd spacing as LM7805, not a different part", () => {
    const result = resolvePartsList("lm 7805 x 4", parts);
    expect(result.matches.map((match) => match.part_number)).toEqual(["LM7805"]);
    expect(result.matches[0]?.quantity).toBe(4);
    expect(result.misses).toEqual([]);
  });

  it("does not treat a prefix as the part", () => {
    const result = resolvePartsList("LM780 x2", parts);
    expect(result.matches).toEqual([]);
    expect(result.misses.map((miss) => miss.query)).toEqual(["LM780"]);
  });

  it("cuts a quantity to the real stock count", () => {
    const lm = parts.find((part) => part.part_number === "LM7805");
    const esp = parts.find((part) => part.part_number === "ESP32-WROOM-32D");
    expect(lm).toBeDefined();
    expect(esp).toBeDefined();
    if (!lm || !esp) return;

    const over = resolvePartsList(`LM7805 x${lm.stock_qty + 25}`, parts);
    expect(over.matches[0]?.requested).toBe(lm.stock_qty + 25);
    expect(over.matches[0]?.quantity).toBe(lm.stock_qty);
    expect(over.matches[0]?.message).toBe(`Only ${lm.stock_qty} in stock`);
    expect(limitNote(over.matches[0])).toBe(
      `LM7805: Only ${lm.stock_qty} in stock. Quantity set to ${lm.stock_qty}.`,
    );

    const combined = resolvePartsList(`ESP32-WROOM-32D x${esp.stock_qty}\nESP32-WROOM-32D x10`, parts);
    expect(combined.matches).toHaveLength(1);
    expect(combined.matches[0]?.requested).toBe(esp.stock_qty + 10);
    expect(combined.matches[0]?.quantity).toBe(esp.stock_qty);
  });

  it("uses a part's minimum and multiple when the catalog rule says so", () => {
    const synthetic: PartsSource[] = [
      {
        part_number: "PACK-5",
        mpn: "PACK-5",
        name: "Packed",
        stock_qty: 20,
        min_qty: 5,
        qty_multiple: 5,
      },
    ];
    const result = resolvePartsList("PACK-5 x 7", synthetic);
    expect(result.matches[0]?.quantity).toBe(5);
    expect(result.matches[0]?.message).toBe("Quantity must be a multiple of 5.");
  });

  it("summarizes matches, misses, and stock cuts", () => {
    const lm = parts.find((part) => part.part_number === "LM7805");
    expect(lm).toBeDefined();
    if (!lm) return;
    const result = resolvePartsList(`LM7805 x${lm.stock_qty + 1}\nTIP120 x1`, parts);
    expect(previewSummary(result)).toBe(
      "1 part matches. 1 is not stocked. 1 quantity was set to the stock count.",
    );
    expect(addLabel(1)).toBe("Add 1 part to cart");
    expect(addLabel(0)).toBe("Nothing to add");
    expect(addLabel(4)).toBe("Add 4 parts to cart");
  });
});

describe("cart link", () => {
  it("round-trips part numbers that contain hyphens and dots", () => {
    const param = encodeCartParam([
      { part_number: "AMS1117-3.3", quantity: 20 },
      { part_number: "ESP32-WROOM-32D", quantity: 1 },
    ]);
    expect(param).toBe("AMS1117-3.3:20,ESP32-WROOM-32D:1");
    expect(parseCartParam(param)).toEqual([
      { part_number: "AMS1117-3.3", quantity: 20 },
      { part_number: "ESP32-WROOM-32D", quantity: 1 },
    ]);
    expect(cartParamToText(param)).toBe("AMS1117-3.3 x20\nESP32-WROOM-32D x1");
  });

  it("builds a quick-order url and a whatsapp body without a phone number", () => {
    const items = [{ part_number: "LM7805", quantity: 10 }];
    const href = cartHref("http://localhost:4321", items);
    expect(href).toBe("http://localhost:4321/quick-order?cart=LM7805%3A10");
    expect(cartWhatsAppText("Lahore Silicon", items)).toBe("Lahore Silicon cart\nLM7805 × 10");
    expect(cartWhatsAppText("Lahore Silicon", items)).not.toMatch(/\d{10,}/);
  });

  it("drops a quantity that is not a positive integer", () => {
    expect(parseCartParam("LM7805:0,nope,NE555:x,:4")).toEqual([]);
  });
});

describe("highlightMatch", () => {
  it("highlights lm 7805 inside LM7805", () => {
    expect(highlightMatch("LM7805", "lm 7805")).toEqual([{ text: "LM7805", hit: true }]);
  });

  it("highlights 5v inside a spaced voltage", () => {
    expect(highlightMatch("5 V regulator", "5v")).toEqual([
      { text: "5 V", hit: true },
      { text: " regulator", hit: false },
    ]);
  });
});
