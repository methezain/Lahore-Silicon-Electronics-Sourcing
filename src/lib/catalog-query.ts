/**
 * Catalog filter and sort. docs/pages.md (Catalog `/`) and docs/motion.md #4.
 * The same rules run on the server (no JavaScript) and in the browser.
 */
import { normalizePartNumber } from "./catalog-search";
import { partSlug } from "./part-image";

export const CATALOG_SORTS = ["catalog", "price", "price-desc", "stock", "stock-desc"] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number];

export type CatalogQuery = {
  category: string | null;
  sort: CatalogSort;
  q: string;
};

export type CatalogMatch = {
  part_number: string;
  name: string;
  category: string;
  keySpec: string;
};

export type CatalogRank = {
  price: number;
  stock: number;
  order: number;
};

const QUERY_MAX = 80;

export function parseCatalogSort(value: string | null): CatalogSort {
  switch (value) {
    case "price":
    case "price-desc":
    case "stock":
    case "stock-desc":
      return value;
    default:
      return "catalog";
  }
}

export function parseCatalogQuery(params: URLSearchParams): CatalogQuery {
  const category = params.get("category")?.trim() ?? "";
  return {
    category: category.length > 0 ? category : null,
    sort: parseCatalogSort(params.get("sort")),
    q: (params.get("q") ?? "").trim().slice(0, QUERY_MAX),
  };
}

/** Hashless form is for replaceState, so typing does not jump to #catalog. */
export function catalogHref(query: CatalogQuery, hash = true): string {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.sort !== "catalog") params.set("sort", query.sort);
  if (query.q) params.set("q", query.q);
  const search = params.toString();
  if (!search) return "/";
  return hash ? `/?${search}#catalog` : `/?${search}`;
}

export function matchesQuery(part: CatalogMatch, query: CatalogQuery): boolean {
  if (query.category && part.category !== query.category) return false;
  const q = query.q.trim();
  if (!q) return true;
  const blob = `${part.part_number} ${part.name} ${part.keySpec} ${part.category}`.toLowerCase();
  const needle = q.toLowerCase();
  if (blob.includes(needle)) return true;
  const compactNeedle = needle.replace(/[\s./\\\-]+/g, "");
  const compactBlob = blob.replace(/[\s./\\\-]+/g, "");
  if (compactNeedle.length > 0 && compactBlob.includes(compactNeedle)) return true;
  const normalized = normalizePartNumber(q);
  return normalized.length > 0 && normalizePartNumber(part.part_number).includes(normalized);
}

export function compareCatalog(sort: CatalogSort) {
  return (a: CatalogRank, b: CatalogRank) => {
    if (sort === "price" || sort === "price-desc") {
      if (a.price !== b.price) return sort === "price" ? a.price - b.price : b.price - a.price;
    } else if (sort === "stock" || sort === "stock-desc") {
      if (a.stock !== b.stock) return sort === "stock" ? a.stock - b.stock : b.stock - a.stock;
    }
    return a.order - b.order;
  };
}

export function counterNoun(count: number): string {
  return count === 1 ? "part" : "parts";
}

export function counterSentence(count: number): string {
  return `${count} ${counterNoun(count)} on the counter`;
}

const SORT_LABEL: Record<CatalogSort, string> = {
  catalog: "Catalog order",
  price: "Price, low to high",
  "price-desc": "Price, high to low",
  stock: "Stock, low to high",
  "stock-desc": "Stock, high to low",
};

export const SORT_OPTIONS: readonly CatalogSort[] = CATALOG_SORTS;

export function sortLabel(sort: CatalogSort): string {
  return SORT_LABEL[sort];
}

export function columnSortState(sort: CatalogSort, key: "price" | "stock"): "ascending" | "descending" | "none" {
  if (sort === key) return "ascending";
  if (sort === `${key}-desc`) return "descending";
  return "none";
}

export function columnSortLabel(column: string, state: "ascending" | "descending" | "none"): string {
  if (state === "none") return `Sort by ${column}`;
  return `${column}, sorted ${state}`;
}

export function nextColumnSort(sort: CatalogSort, key: "price" | "stock"): CatalogSort {
  if (sort === key) return `${key}-desc`;
  if (sort === `${key}-desc`) return "catalog";
  return key;
}

export function sameQuery(a: CatalogQuery, b: CatalogQuery): boolean {
  return a.category === b.category && a.sort === b.sort && a.q === b.q;
}

/** Category with no rows, then a text miss, then an empty counter. */
export function emptyCatalogCopy(query: CatalogQuery, matched: number, inCategory: number): string | null {
  if (matched > 0) return null;
  if (!query.category && !query.q) return "No parts on the counter.";
  if (query.category && inCategory === 0) return `No parts in ${query.category}.`;
  if (query.q) return `No parts match "${query.q}".`;
  if (query.category) return `No parts in ${query.category}.`;
  return "No parts on the counter.";
}

export function rowTransitionName(partNumber: string): string {
  const slug = partSlug(partNumber);
  return slug ? `row-${slug}` : "";
}

/** Names for the list row and the grid item. Hidden layouts are not rendered, so only one is live. */
export function catalogRowTransitionCss(partNumbers: readonly string[]): string {
  const rules: string[] = ["#catalog.is-filtering .cat-card{view-transition-name:none}"];
  for (const partNumber of partNumbers) {
    const name = rowTransitionName(partNumber);
    if (!name) continue;
    const attr = `[data-vt="${name}"]`;
    rules.push(
      `#catalog.is-filtering [data-layout="list"] tr${attr}{view-transition-name:${name}}`,
      `#catalog.is-filtering [data-layout="grid"] li${attr}{view-transition-name:${name}}`,
    );
  }
  return rules.join("");
}
