import { describe, expect, it } from "vitest";
import { companionsForCart } from "../../src/lib/cart-companions";

const catalog = [
  { part_number: "ESP32-WROOM-32D", companions: ["AMS1117-3.3"] },
  { part_number: "AMS1117-3.3" },
  { part_number: "LM7805" },
  { part_number: "HC-SR04", companions: ["ARDUINO-NANO", "ESP32-WROOM-32D"] },
  { part_number: "ARDUINO-NANO" },
];

describe("cart companions", () => {
  it("lists companions of parts in the cart, in cart order", () => {
    expect(companionsForCart(catalog, ["LM7805"]).map((part) => part.part_number)).toEqual([]);
    expect(companionsForCart(catalog, ["ESP32-WROOM-32D"]).map((part) => part.part_number)).toEqual(["AMS1117-3.3"]);
    expect(companionsForCart(catalog, ["HC-SR04", "ESP32-WROOM-32D"]).map((part) => part.part_number)).toEqual([
      "ARDUINO-NANO",
      "AMS1117-3.3",
    ]);
  });

  it("skips a companion already in the cart or missing from the catalog", () => {
    expect(companionsForCart(catalog, ["ESP32-WROOM-32D", "AMS1117-3.3"])).toEqual([]);
    const missing = [{ part_number: "ESP32-WROOM-32D", companions: ["NO-SUCH-PART"] }];
    expect(companionsForCart(missing, ["ESP32-WROOM-32D"])).toEqual([]);
  });
});
