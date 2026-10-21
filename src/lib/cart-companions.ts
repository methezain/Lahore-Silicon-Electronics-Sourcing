export type CompanionSource = {
  part_number: string;
  companions?: readonly string[];
};

/**
 * Companions named on parts that are in the cart, in cart order.
 * Skips parts already in the cart and ids the catalog does not sell.
 */
export function companionsForCart<T extends CompanionSource>(
  catalog: readonly T[],
  cartPartNumbers: readonly string[],
): T[] {
  const byNumber = new Map(catalog.map((part) => [part.part_number, part]));
  const inCart = new Set(cartPartNumbers);
  const seen = new Set<string>();
  const result: T[] = [];

  for (const partNumber of cartPartNumbers) {
    const part = byNumber.get(partNumber);
    for (const companionId of part?.companions ?? []) {
      if (inCart.has(companionId) || seen.has(companionId)) continue;
      const match = byNumber.get(companionId);
      if (!match) continue;
      seen.add(companionId);
      result.push(match);
    }
  }

  return result;
}
