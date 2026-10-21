/**
 * Home page selection. docs/pages.md#home- and docs/commerce.md#categories.
 * The front card is the part with `featured: true`.
 * There is no sales rank and no arrival date (docs/decisions.md).
 * The two cards behind it are parts from the featured category.
 */

export type HomePart = {
  part_number: string;
  category: string;
  featured?: boolean;
  image?: unknown;
};

export function orderedParts<T extends { category: string; part_number: string }>(
  parts: readonly T[],
  categories: readonly string[],
): T[] {
  const order = new Map(categories.map((category, index) => [category, index]));
  return [...parts].sort((a, b) => {
    const categoryDiff = (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99);
    if (categoryDiff !== 0) return categoryDiff;
    return a.part_number.localeCompare(b.part_number);
  });
}

export function categoryCounts<T extends { category: string }>(
  parts: readonly T[],
  categories: readonly string[],
): { category: string; count: number }[] {
  return categories
    .map((category) => ({
      category,
      count: parts.filter((part) => part.category === category).length,
    }))
    .filter((row) => row.count > 0);
}

/**
 * Featured tile first. The others go by count, highest first, so the
 * right-hand pair on desktop is the two largest jobs. Ties keep category order.
 */
export function bentoOrder<T extends { category: string; count: number }>(
  counts: readonly T[],
  categories: readonly string[],
  featured: string | null,
): T[] {
  const rank = new Map(categories.map((category, index) => [category, index]));
  const rest = counts
    .filter((row) => row.category !== featured)
    .sort((a, b) => b.count - a.count || (rank.get(a.category) ?? 99) - (rank.get(b.category) ?? 99));
  return [...counts.filter((row) => row.category === featured), ...rest];
}

/** Preferred category when it still has parts; otherwise the largest, ties keep list order. */
export function resolveFeaturedCategory<T extends { category: string }>(
  parts: readonly T[],
  categories: readonly string[],
  preferred: string | null,
): string | null {
  const counts = categoryCounts(parts, categories);
  if (counts.length === 0) return null;
  if (preferred && counts.some((row) => row.category === preferred)) return preferred;
  let best = counts[0];
  for (const row of counts) {
    if (row.count > best.count) best = row;
  }
  return best.category;
}

/**
 * Front card, then up to two parts behind it (nearest first).
 * Behind cards come from the featured category, then the rest of the catalog.
 */
export function pickHeroDeck<T extends HomePart>(
  parts: readonly T[],
  categories: readonly string[],
  featuredCategoryName: string | null,
): { front: T; behind: T[] } | null {
  const ordered = orderedParts(parts, categories);
  if (ordered.length === 0) return null;
  const front = ordered.find((part) => part.featured) ?? ordered[0];
  const rest = ordered.filter((part) => part.part_number !== front.part_number);
  const fromFeature = featuredCategoryName
    ? rest.filter((part) => part.category === featuredCategoryName)
    : [];
  const used = new Set(fromFeature.map((part) => part.part_number));
  const fillers = rest.filter((part) => !used.has(part.part_number));
  return { front, behind: [...fromFeature, ...fillers].slice(0, 2) };
}

/** Preferred part when it is in the category and has a photo; otherwise the first photo. */
export function categoryPhoto<T extends HomePart>(
  parts: readonly T[],
  category: string,
  categories: readonly string[],
  preferredPartNumber?: string,
): T | undefined {
  const group = orderedParts(parts, categories).filter((part) => part.category === category);
  if (preferredPartNumber) {
    const preferred = group.find((part) => part.part_number === preferredPartNumber && part.image != null);
    if (preferred) return preferred;
  }
  return group.find((part) => part.image != null) ?? group[0];
}

export function partList(partNumbers: readonly string[]): string {
  const names = partNumbers.filter((name) => name.trim().length > 0);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Key spec column. The voltage line is already formatted in the part data. */
export function keySpec(part: { voltage?: string; package_type: string }): string {
  const voltage = part.voltage?.trim();
  return voltage ? voltage : part.package_type;
}

export function partNoun(count: number): string {
  return count === 1 ? "part" : "parts";
}
