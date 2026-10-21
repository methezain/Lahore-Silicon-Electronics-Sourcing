/**
 * Pin positions for the product-page diagram.
 * Names and notes come from the part's `pinout` field. This file only places them.
 *
 * Numbered packages follow their standard pin order (DIP notch at the top,
 * TO-220 / TO-92 / SOT-223 pins left to right in the listing order, which is
 * the datasheet order already stored on the part).
 * ESP32-WROOM-32D: Espressif top view, antenna end at the top. Pin 1 is the
 * top-left pad, 1–14 down the left edge, 15–24 left to right along the bottom,
 * 25–38 up the right edge. Pin 39 is not in the listing, so it is not drawn.
 * Arduino Nano: USB end at the top, component side. Header positions are the
 * A000005 pinout. A pin is drawn on both headers only when its note says so.
 * Anything else is listing order, with a caveat, because the board order is not recorded.
 */

export type PinoutPin = {
  pin: string;
  label: string;
  note?: string;
};

export type PinShape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; tone: "body" | "metal"; rx?: number }
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "notch"; x: number; y: number; w: number; h: number };

export type PinMark = {
  pin: string;
  x: number;
  y: number;
  x1: number;
  y1: number;
  wide?: { x: number; y: number; w: number; h: number };
};

export type PinConnector = {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
};

export type PinFigure = {
  width: number;
  height: number;
  shapes: PinShape[];
  marks: PinMark[];
  connector?: PinConnector;
  caveat?: string;
};

export const PIN_ORDER_CAVEAT = "The listing does not give the order of these pins on the board.";

export function pinFigure(input: {
  packageType: string;
  pins: readonly PinoutPin[];
  connector?: string;
}): PinFigure {
  const pins = input.pins;
  if (isNano(input.packageType, pins)) return nanoFigure(pins, input.connector);
  if (isEspModule(input.packageType, pins)) return espFigure();
  const dip = dipCount(input.packageType);
  if (dip !== null && isNumbered(pins, dip)) return dipFigure(pins, dip);
  if (/^(TO-220|TO-92|SOT-223)$/i.test(input.packageType)) return rowPackage(input.packageType, pins);
  return listingRow(pins);
}

function isNumbered(pins: readonly PinoutPin[], count: number): boolean {
  if (pins.length !== count) return false;
  const seen = new Set(pins.map((pin) => pin.pin));
  for (let n = 1; n <= count; n += 1) {
    if (!seen.has(String(n))) return false;
  }
  return true;
}

function isNano(packageType: string, pins: readonly PinoutPin[]): boolean {
  if (!/DIP-30/i.test(packageType)) return false;
  const names = new Set(pins.map((pin) => pin.pin));
  return names.has("D13") && names.has("VIN") && names.has("D0");
}

function isEspModule(packageType: string, pins: readonly PinoutPin[]): boolean {
  return /^module$/i.test(packageType) && isNumbered(pins, 38);
}

function dipCount(packageType: string): number | null {
  const match = /^DIP-(\d+)$/i.exec(packageType.trim());
  if (!match) return null;
  const count = Number(match[1]);
  if (!Number.isInteger(count) || count < 4 || count % 2 !== 0) return null;
  return count;
}

function espFigure(): PinFigure {
  const leftX = 48;
  const bodyX = 68;
  const bodyW = 132;
  const bodyRight = bodyX + bodyW;
  const rightX = bodyRight + 20;
  const bodyY = 24;
  const bodyH = 286;
  const pitchY = (bodyH - 36) / 13;
  const topY = bodyY + 18;
  const marks: PinMark[] = [];

  for (let n = 1; n <= 14; n += 1) {
    const y = topY + (n - 1) * pitchY;
    marks.push({ pin: String(n), x: leftX, y, x1: bodyX, y1: y });
  }

  const bottomY = bodyY + bodyH + 18;
  const pitchX = (bodyW - 36) / 9;
  for (let n = 15; n <= 24; n += 1) {
    const x = bodyX + 18 + (n - 15) * pitchX;
    marks.push({ pin: String(n), x, y: bottomY, x1: x, y1: bodyY + bodyH });
  }

  for (let n = 25; n <= 38; n += 1) {
    const y = topY + (38 - n) * pitchY;
    marks.push({ pin: String(n), x: rightX, y, x1: bodyRight, y1: y });
  }

  return {
    width: rightX + 28,
    height: bottomY + 28,
    shapes: [
      { kind: "rect", x: bodyX, y: bodyY, w: bodyW, h: bodyH, tone: "body" },
      { kind: "rect", x: bodyX + 22, y: bodyY + 14, w: bodyW - 44, h: 78, tone: "metal" },
    ],
    marks,
  };
}

const NANO_LEFT = ["D13", "+3V3", "AREF", "A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "+5V", "RESET", "GND", "VIN"];
const NANO_RIGHT = ["D12", "D11", "D10", "D9", "D8", "D7", "D6", "D5", "D4", "D3", "D2", "GND", "RESET", "D0", "D1"];

function nanoFigure(pins: readonly PinoutPin[], connector?: string): PinFigure {
  const pitch = 14;
  const top = 52;
  const leftX = 22;
  const bodyX = 42;
  const bodyW = 84;
  const rightX = bodyX + bodyW + 20;
  const bodyY = 40;
  const bodyH = 16 + (NANO_LEFT.length - 1) * pitch + 20;
  const spots = new Map<string, PinMark[]>();

  function add(pin: string, x: number, leadX: number, index: number) {
    const y = top + index * pitch;
    const list = spots.get(pin) ?? [];
    list.push({ pin, x, y, x1: leadX, y1: y });
    spots.set(pin, list);
  }

  NANO_LEFT.forEach((pin, index) => add(pin, leftX, bodyX, index));
  NANO_RIGHT.forEach((pin, index) => add(pin, rightX, bodyX + bodyW, index));

  const marks: PinMark[] = [];
  const missed: PinoutPin[] = [];
  for (const pin of pins) {
    const options = spots.get(pin.pin);
    if (!options || options.length === 0) {
      missed.push(pin);
      continue;
    }
    const both = /both headers/i.test(pin.note ?? "");
    marks.push(...(both ? options : options.slice(0, 1)));
  }

  const width = rightX + 28;
  const height = bodyY + bodyH + (missed.length > 0 ? 36 : 16);
  if (missed.length > 0) {
    const extraTop = bodyY + bodyH + 16;
    missed.forEach((pin, index) => {
      const x = 36 + index * 28;
      marks.push({ pin: pin.pin, x, y: extraTop, x1: x, y1: extraTop - 12 });
    });
  }

  const text = connector?.trim();
  const plugW = 64;
  const plug: PinConnector | undefined = text
    ? { x: bodyX + (bodyW - plugW) / 2, y: 12, w: plugW, h: 22, text }
    : undefined;

  return {
    width,
    height,
    shapes: [{ kind: "rect", x: bodyX, y: bodyY, w: bodyW, h: bodyH, tone: "body" }],
    marks,
    ...(plug ? { connector: plug } : {}),
    ...(missed.length > 0 ? { caveat: PIN_ORDER_CAVEAT } : {}),
  };
}

function dipFigure(pins: readonly PinoutPin[], count: number): PinFigure {
  const half = count / 2;
  const pitch = 22;
  const top = 40;
  const leftX = 22;
  const bodyX = 44;
  const bodyW = 72;
  const rightX = bodyX + bodyW + 22;
  const bodyY = 22;
  const bodyH = 20 + (half - 1) * pitch + 24;
  const marks: PinMark[] = [];

  for (const pin of pins) {
    const n = Number(pin.pin);
    if (n <= half) {
      const y = top + (n - 1) * pitch;
      marks.push({ pin: pin.pin, x: leftX, y, x1: bodyX, y1: y });
    } else {
      const y = top + (count - n) * pitch;
      marks.push({ pin: pin.pin, x: rightX, y, x1: bodyX + bodyW, y1: y });
    }
  }

  return {
    width: rightX + 24,
    height: bodyY + bodyH + 16,
    shapes: [
      { kind: "rect", x: bodyX, y: bodyY, w: bodyW, h: bodyH, tone: "body" },
      { kind: "notch", x: bodyX + bodyW / 2 - 10, y: bodyY, w: 20, h: 6 },
    ],
    marks,
  };
}

function rowPackage(packageType: string, pins: readonly PinoutPin[]): PinFigure {
  const count = Math.max(pins.length, 1);
  const pitch = 32;
  const width = Math.max(200, 64 + (count - 1) * pitch);
  const span = (count - 1) * pitch;
  const startX = (width - span) / 2;
  const padY = 128;
  const bodyBottom = 92;
  const marks: PinMark[] = pins.map((pin, index) => ({
    pin: pin.pin,
    x: startX + index * pitch,
    y: padY,
    x1: startX + index * pitch,
    y1: bodyBottom,
  }));

  const kind = packageType.toUpperCase();
  const shapes: PinShape[] = [];
  if (kind === "TO-220") {
    shapes.push(
      { kind: "rect", x: width / 2 - 26, y: 8, w: 52, h: 34, tone: "metal" },
      { kind: "circle", cx: width / 2, cy: 24, r: 6 },
      { kind: "rect", x: width / 2 - 40, y: 36, w: 80, h: 56, tone: "body" },
    );
  } else if (kind === "TO-92") {
    shapes.push({ kind: "rect", x: width / 2 - 34, y: 20, w: 68, h: 72, rx: 34, tone: "body" });
  } else {
    shapes.push({ kind: "rect", x: width / 2 - 58, y: 52, w: 116, h: 40, tone: "body" });
    const tab = pins.find((pin) => /tab/i.test(pin.note ?? ""));
    const mark = tab ? marks.find((item) => item.pin === tab.pin) : undefined;
    if (mark) mark.wide = { x: width / 2 - 30, y: 16, w: 60, h: 36 };
  }

  return { width, height: 156, shapes, marks };
}

function listingRow(pins: readonly PinoutPin[]): PinFigure {
  const count = Math.max(pins.length, 1);
  const pitch = 36;
  const width = Math.max(220, 72 + (count - 1) * pitch);
  const span = (count - 1) * pitch;
  const startX = (width - span) / 2;
  const padY = 112;
  const marks: PinMark[] = pins.map((pin, index) => ({
    pin: pin.pin,
    x: startX + index * pitch,
    y: padY,
    x1: startX + index * pitch,
    y1: 78,
  }));
  return {
    width,
    height: 144,
    shapes: [{ kind: "rect", x: 36, y: 20, w: width - 72, h: 58, tone: "body" }],
    marks,
    caveat: PIN_ORDER_CAVEAT,
  };
}
