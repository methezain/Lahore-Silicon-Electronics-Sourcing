/**
 * Shared photo boxes and the view-transition name shared by a catalog
 * thumbnail and the product gallery. Names are CSS idents: `AMS1117-3.3`
 * becomes `part-ams1117-3-3`.
 */

/** 1120px frame, 32px padding each side, 24px column gap → 516px. Mobile gutter is 16px. */
export const productPhoto = {
  width: 640,
  height: 640,
  sizes: "(min-width: 720px) min(516px, calc((100vw - 88px) / 2)), calc(100vw - 32px)",
  /** 1× desktop slot and a 1024 source for 2×. */
  widths: [640, 1024],
} as const;

/** Table thumbnails and cart lines. The list uses the same box; its column is wider. */
export const thumb56 = {
  width: 56,
  height: 56,
  sizes: "56px",
} as const;

/** 2× source for the 56px box. */
export const thumb56Source = 112;

export function partSlug(partNumber: string): string {
  return partNumber
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function partTransitionName(partNumber: string): string {
  return `part-${partSlug(partNumber)}`;
}

export function partTransitionClass(partNumber: string): string {
  return `vt-${partTransitionName(partNumber)}`;
}

/** One rule per part. Callers pass catalog part numbers, which this slug-sanitizes. */
export function partTransitionCss(partNumbers: readonly string[]): string {
  return partNumbers
    .map((partNumber) => {
      const name = partTransitionName(partNumber);
      if (name === "part-") return "";
      return `.${partTransitionClass(partNumber)}{view-transition-name:${name}}`;
    })
    .filter(Boolean)
    .join("");
}
