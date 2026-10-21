import { describe, expect, it } from "vitest";
import { etaLead, etaDetail, keyFigures, pricedChoice, productMetaDescription, purchaseModel, quantityBreakTable } from "../../src/lib/product";
import { deliveryCost, lahoreDelivery, nationwideDelivery } from "../../src/lib/shipping";

const ask = "https://wa.me/923001112233";

describe("purchaseModel out of stock", () => {
  const shelf = {
    part_number: "LM7805",
    price: 45,
    stock_qty: 48,
    restock_on: "2026-11-12",
  };

  it("disables the add control when a fixture sets stock to 0", () => {
    const fixture = { ...shelf, stock_qty: 0 };
    expect(purchaseModel({
      stockQty: fixture.stock_qty,
      restockOn: fixture.restock_on,
      lineTotal: fixture.price,
      askHref: ask,
    })).toEqual({
      label: "Out of stock",
      disabled: true,
      askHref: ask,
      stock: "Out of stock, back around 12 Nov 2026",
      level: "out",
    });
  });

  it("omits the date and the ask link when neither was supplied", () => {
    const fixture = { ...shelf, stock_qty: 0, restock_on: undefined };
    expect(purchaseModel({
      stockQty: fixture.stock_qty,
      restockOn: fixture.restock_on,
      lineTotal: fixture.price,
    })).toEqual({
      label: "Out of stock",
      disabled: true,
      stock: "Out of stock",
      level: "out",
    });
  });

  it("keeps WhatsApp off the in-stock control", () => {
    const model = purchaseModel({
      stockQty: shelf.stock_qty,
      lineTotal: 90,
      askHref: ask,
    });
    expect(model.disabled).toBe(false);
    expect(model.label).toBe("Add to cart · Rs 90");
    expect(model.askHref).toBeUndefined();
    expect(model.stock).toBe("48 in stock");
  });
});

describe("quantity breaks and key figures", () => {
  it("lists tiers only when the part has breaks", () => {
    expect(quantityBreakTable({ price: 45 })).toEqual([]);
    expect(quantityBreakTable({
      price: 45,
      breaks: [
        { min_qty: 50, unit_price: 35 },
        { min_qty: 10, unit_price: 40 },
      ],
    })).toEqual([
      { quantity: "1–9", unitPrice: "Rs 45" },
      { quantity: "10–49", unitPrice: "Rs 40" },
      { quantity: "50+", unitPrice: "Rs 35" },
    ]);
  });

  it("prices the chosen quantity and leaves a zero-stock shelf price alone", () => {
    const part = { price: 45, breaks: [{ min_qty: 10, unit_price: 40 }] };
    expect(pricedChoice(part, 10, 48)).toEqual({ unit: 40, total: 400 });
    expect(pricedChoice(part, 0, 0)).toEqual({ unit: 45, total: 45 });
  });

  it("uses the first four specs and drops a unit when the spec has none", () => {
    expect(keyFigures([
      { label: "Output voltage", value: "5", unit: "V" },
      { label: "Output current", value: "1", unit: "A" },
      { label: "Input voltage", value: "7–35", unit: "V" },
      { label: "Package", value: "TO-220" },
      { label: "Mounting", value: "Through-hole" },
    ])).toEqual([
      { label: "Output voltage", value: "5", unit: "V" },
      { label: "Output current", value: "1", unit: "A" },
      { label: "Input voltage", value: "7–35", unit: "V" },
      { label: "Package", value: "TO-220" },
    ]);
  });

  it("follows key_specs labels and skips a label that is not on the part", () => {
    expect(keyFigures([
      { label: "Output voltage", value: "5", unit: "V" },
      { label: "Package", value: "TO-220" },
      { label: "Output current", value: "1", unit: "A" },
    ], ["Output current", "Missing", "Output voltage"])).toEqual([
      { label: "Output current", value: "1", unit: "A" },
      { label: "Output voltage", value: "5", unit: "V" },
    ]);
  });

  it("builds the product description from the summary", () => {
    expect(productMetaDescription("Turns 7–35 V into a steady 5 V at up to 1 A."))
      .toBe("Turns 7–35 V into a steady 5 V at up to 1 A. Ships from Hall Road, Lahore.");
  });
});

describe("product ETA", () => {
  it("uses the clock lead and the shipping sentences", () => {
    expect(etaLead(new Date("2026-10-21T11:48:00+05:00"))).toBe("Order within 3 h 12 m");
    expect(etaLead(new Date("2026-10-25T04:00:00Z"))).toBe("Dispatch resumes Monday");
    expect(etaDetail).toBe(`${lahoreDelivery} ${nationwideDelivery} ${deliveryCost}`);
  });
});
