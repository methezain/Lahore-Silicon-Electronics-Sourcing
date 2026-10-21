/**
 * Shared photo boxes and the view-transition names shared by a catalog
 * row and the product page. Names are CSS idents: `AMS1117-3.3`
 * becomes `part-photo-ams1117-3-3` and `part-chip-ams1117-3-3`.
 */

/**
 * Desktop slot: 1.15 / 2 of (min(100vw, 1280px) − 64px gutter − 32px gap), minus 24px gallery padding.
 * Mobile: viewport minus 32px gutter and 24px gallery padding.
 */
export const productPhoto = {
  width: 640,
  height: 640,
  sizes: "(min-width: 900px) calc((min(100vw, 1280px) - 96px) * 0.575 - 24px), calc(100vw - 56px)",
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

/** Photo morph. Empty when the part number has no safe ident. */
export function partPhotoName(partNumber: string): string {
  const slug = partSlug(partNumber);
  return slug ? `part-photo-${slug}` : "";
}

/** Part-number chip morph. */
export function partChipName(partNumber: string): string {
  const slug = partSlug(partNumber);
  return slug ? `part-chip-${slug}` : "";
}

export function partTransitionName(partNumber: string): string {
  return partPhotoName(partNumber);
}

export function partTransitionClass(partNumber: string): string {
  const name = partPhotoName(partNumber);
  return name ? `vt-${name}` : "";
}

export function partChipClass(partNumber: string): string {
  const name = partChipName(partNumber);
  return name ? `vt-${name}` : "";
}

/** One photo rule and one chip rule per part. Callers pass catalog part numbers. */
export function partTransitionCss(partNumbers: readonly string[]): string {
  const rules: string[] = [];
  const selectors: string[] = [];
  for (const partNumber of partNumbers) {
    const photo = partPhotoName(partNumber);
    const chip = partChipName(partNumber);
    if (!photo || !chip) continue;
    const photoClass = `vt-${photo}`;
    const chipClass = `vt-${chip}`;
    rules.push(`.${photoClass}{view-transition-name:${photo};view-transition-class:part-morph part-photo}`);
    rules.push(`.${chipClass}{view-transition-name:${chip};view-transition-class:part-morph part-chip}`);
    selectors.push(`.${photoClass}`, `.${chipClass}`);
  }
  if (selectors.length === 0) return "";
  rules.push(
    `@media (prefers-reduced-motion:reduce){${selectors.join(",")}{view-transition-name:none;view-transition-class:none}}`,
  );
  return rules.join("");
}
