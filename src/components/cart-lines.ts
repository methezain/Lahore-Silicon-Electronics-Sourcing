export type LinePhase = "enter" | "grow" | "idle" | "slide" | "collapse";

export type LineRow = {
  part_number: string;
  phase: LinePhase;
  /** Stagger slot. Capped at 5 so the 6th line and later share one delay. */
  index: number;
};

const STAGGER_CAP = 5;

/**
 * Open staggers every line already in the cart. A line added while the sheet
 * is open grows. A line that left the cart slides, then collapses, unless
 * reduced motion removes it immediately.
 */
export function reconcileRows(
  current: readonly LineRow[],
  ids: readonly string[],
  reduced: boolean,
  /** This part stays full height so a photo morph has a box to land on. */
  fullSizePart?: string,
): LineRow[] {
  const inCart = new Set(ids);
  const next: LineRow[] = [];
  const seen = new Set<string>();

  for (const row of current) {
    seen.add(row.part_number);
    if (inCart.has(row.part_number)) {
      const leaving = row.phase === "slide" || row.phase === "collapse";
      next.push(leaving
        ? { part_number: row.part_number, phase: reduced ? "idle" : "grow", index: 0 }
        : row);
      continue;
    }
    if (reduced) continue;
    if (row.phase === "slide" || row.phase === "collapse") {
      next.push(row);
      continue;
    }
    next.push({ ...row, phase: "slide" });
  }

  const opening = current.length === 0;
  for (let index = 0; index < ids.length; index += 1) {
    const partNumber = ids[index];
    if (!partNumber || seen.has(partNumber)) continue;
    const morph = fullSizePart === partNumber;
    next.push({
      part_number: partNumber,
      phase: reduced ? "idle" : opening || morph ? "enter" : "grow",
      index: opening ? Math.min(index, STAGGER_CAP) : 0,
    });
  }

  return next;
}
