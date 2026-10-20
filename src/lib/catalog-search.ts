export type SearchPart = {
  part_number: string;
  mpn: string;
  name: string;
  category: string;
};

export function searchCatalog<T extends SearchPart>(parts: readonly T[], query: string): {
  hits: T[];
  exactMiss: boolean;
} {
  const q = query.trim();
  if (!q) return { hits: [], exactMiss: false };
  const needle = q.toLowerCase();
  const exact = parts.filter(
    (part) => part.part_number.toLowerCase() === needle || part.mpn.toLowerCase() === needle,
  );
  const rest = parts.filter(
    (part) =>
      !exact.includes(part) &&
      [part.part_number, part.mpn, part.name, part.category].some((field) =>
        field.toLowerCase().includes(needle),
      ),
  );
  const hits = [...exact, ...rest];
  const looksLikePart = /^[a-z0-9][a-z0-9.+-]{1,}$/i.test(q);
  return { hits, exactMiss: hits.length === 0 && looksLikePart };
}
