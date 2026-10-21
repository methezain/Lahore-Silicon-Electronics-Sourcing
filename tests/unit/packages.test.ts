import { describe, expect, it } from "vitest";
import { PACKAGE_KINDS, PACKAGE_SHEET, packageSvg, resolveKind } from "../../src/components/illustrations/packages";

function pins(svg: string): number[] {
  return [...svg.matchAll(/data-pin="(\d+)"/g)].map((match) => Number(match[1])).sort((a, b) => a - b);
}

function contacts(svg: string): number[] {
  return [...svg.matchAll(/data-contact="(\d+)"/g)].map((match) => Number(match[1])).sort((a, b) => a - b);
}

describe("package illustrations", () => {
  it("draws each package once, with a 1.5px stroke and one signal accent", () => {
    for (const kind of PACKAGE_KINDS) {
      const svg = packageSvg(kind);
      expect(svg).toContain(`data-package="${kind}"`);
      expect(svg).toContain('stroke="currentColor"');
      expect(svg).toContain('stroke-width="1.5"');
      expect(svg.match(/stroke="var\(--color-signal\)"/g)).toHaveLength(1);
      expect(svg).not.toMatch(/#[0-9a-fA-F]{3,8}/);
      expect(svg).not.toMatch(/\b(?:oklch|rgba?)\(/);
    }
  });

  it("keeps the lead counts of each package", () => {
    expect(pins(packageSvg("to-220"))).toEqual([1, 2, 3]);
    expect(pins(packageSvg("to-92"))).toEqual([1, 2, 3]);
    expect(pins(packageSvg("sot-223"))).toEqual([1, 2, 3, 4]);
    expect(pins(packageSvg("dip-8"))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(pins(packageSvg("module"))).toEqual([1, 2, 3, 4]);
    expect(pins(packageSvg("relay"))).toEqual([1, 2, 3]);
    expect(contacts(packageSvg("relay"))).toEqual([1, 2, 3]);
    expect(packageSvg("relay")).toContain('data-contacts="3"');
    expect(packageSvg("module")).toContain('data-pins="4"');
    expect(packageSvg("dip-8")).toContain('data-pins="8"');
  });

  it("maps catalog package names and leaves unknown names unmatched", () => {
    expect(resolveKind("TO-220")).toBe("to-220");
    expect(resolveKind("TO-92")).toBe("to-92");
    expect(resolveKind("SOT-223")).toBe("sot-223");
    expect(resolveKind("DIP-8")).toBe("dip-8");
    expect(resolveKind("Module", "ESP32-WROOM-32D")).toBe("module");
    expect(resolveKind("DIP-30 module", "ARDUINO-NANO")).toBe("module");
    expect(resolveKind("PCB module", "HC-SR04")).toBe("module");
    expect(resolveKind("PCB module", "TCRT5000")).toBe("module");
    expect(resolveKind("PCB module", "SRD-05VDC-SL-C")).toBe("relay");
    expect(resolveKind("relay module")).toBe("relay");
    expect(resolveKind("Sample")).toBeNull();
    expect(resolveKind("")).toBeNull();
    expect(resolveKind(undefined, undefined)).toBeNull();
    expect(PACKAGE_SHEET.map((row) => row.kind)).toEqual([...PACKAGE_KINDS]);
  });
});
