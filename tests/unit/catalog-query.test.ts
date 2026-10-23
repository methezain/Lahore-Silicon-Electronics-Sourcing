import { describe, expect, it } from "vitest";
import {
  catalogHref,
  clampPage,
  pageCount,
  pageSlice,
  pagerItems,
  columnSortState,
  compareCatalog,
  counterSentence,
  emptyCatalogCopy,
  matchesQuery,
  nextColumnSort,
  parseCatalogQuery,
  type CatalogMatch,
  type CatalogRank,
} from "../../src/lib/catalog-query";

const lm: CatalogMatch & CatalogRank = {
  part_number: "LM7805",
  name: "5 V regulator",
  category: "Power",
  keySpec: "5 V",
  price: 40,
  stock: 20,
  order: 2,
};

const relay: CatalogMatch & CatalogRank = {
  part_number: "SRD-05VDC-SL-C",
  name: "Relay module",
  category: "Relays",
  keySpec: "5 V",
  price: 180,
  stock: 4,
  order: 1,
};

describe("catalog query", () => {
  it("parses category, sort and a trimmed filter", () => {
    const query = parseCatalogQuery(new URLSearchParams("category=Power&sort=price-desc&q=%20lm%207805%20"));
    expect(query).toEqual({ category: "Power", sort: "price-desc", q: "lm 7805", page: 1 });
  });

  it("ignores an unknown sort and a blank category", () => {
    expect(parseCatalogQuery(new URLSearchParams("category=%20&sort=newest"))).toEqual({
      category: null,
      sort: "catalog",
      q: "",
      page: 1,
    });
  });

  it("keeps the hash on links and drops it for replaceState", () => {
    const query = { category: "Relays", sort: "stock" as const, q: "5 V", page: 1 };
    expect(catalogHref(query)).toBe("/?category=Relays&sort=stock&q=5+V#catalog");
    expect(catalogHref(query, false)).toBe("/?category=Relays&sort=stock&q=5+V");
    expect(catalogHref({ category: null, sort: "catalog", q: "", page: 1 })).toBe("/");
  });

  it("matches a spaced part number and keeps category exact", () => {
    expect(matchesQuery(lm, { category: null, sort: "catalog", q: "lm 7805", page: 1 })).toBe(true);
    expect(matchesQuery(lm, { category: "Power", sort: "catalog", q: "", page: 1 })).toBe(true);
    expect(matchesQuery(relay, { category: "Power", sort: "catalog", q: "", page: 1 })).toBe(false);
    expect(matchesQuery(lm, { category: "Nope", sort: "catalog", q: "LM7805", page: 1 })).toBe(false);
  });

  it("sorts price and stock, and breaks ties by catalog order", () => {
    const same = { ...relay, price: 40, order: 0 };
    const byPrice = [lm, same].sort(compareCatalog("price")).map((part) => part.part_number);
    expect(byPrice).toEqual(["SRD-05VDC-SL-C", "LM7805"]);
    const byStock = [lm, relay].sort(compareCatalog("stock-desc")).map((part) => part.part_number);
    expect(byStock).toEqual(["LM7805", "SRD-05VDC-SL-C"]);
  });

  it("names one part and many parts", () => {
    expect(counterSentence(1)).toBe("1 part on the counter");
    expect(counterSentence(10)).toBe("10 parts on the counter");
  });

  it("says which filter came up empty", () => {
    const none = { category: "Nope", sort: "catalog" as const, q: "", page: 1 };
    expect(emptyCatalogCopy(none, 0, 0)).toBe("No parts in Nope.");
    expect(emptyCatalogCopy({ category: "Power", sort: "catalog", q: "zzzz", page: 1 }, 0, 3)).toBe('No parts match "zzzz".');
    expect(emptyCatalogCopy({ category: null, sort: "catalog", q: "", page: 1 }, 4, 4)).toBeNull();
  });

  it("cycles a column sort the way the header links do", () => {
    expect(nextColumnSort("catalog", "price")).toBe("price");
    expect(nextColumnSort("price", "price")).toBe("price-desc");
    expect(nextColumnSort("price-desc", "price")).toBe("catalog");
    expect(columnSortState("price", "price")).toBe("ascending");
    expect(columnSortState("price-desc", "stock")).toBe("none");
  });
});

describe("pagination", () => {
  it("shows 12 parts per page", () => {
    const items = Array.from({ length: 30 }, (_, index) => index);
    expect(pageSlice(items, 1)).toHaveLength(12);
    expect(pageSlice(items, 3)).toEqual([24, 25, 26, 27, 28, 29]);
    expect(pageCount(12)).toBe(1);
    expect(pageCount(13)).toBe(2);
    expect(pageCount(0)).toBe(1);
  });

  it("clamps a page that is out of range", () => {
    expect(clampPage(9, 30)).toBe(3);
    expect(clampPage(0, 30)).toBe(1);
    expect(clampPage(Number.NaN, 30)).toBe(1);
  });

  it("reads and writes the page in the URL", () => {
    expect(parseCatalogQuery(new URLSearchParams("page=2")).page).toBe(2);
    expect(parseCatalogQuery(new URLSearchParams("page=abc")).page).toBe(1);
    expect(catalogHref({ category: null, sort: "catalog", q: "", page: 2 }, false)).toBe("/?page=2");
  });

  it("builds the pager with gaps and no pager for one page", () => {
    expect(pagerItems(1, 1)).toEqual([]);
    expect(pagerItems(1, 2).map((item) => item.kind)).toEqual(["page", "page", "next"]);
    expect(pagerItems(5, 9).map((item) => (item.kind === "page" ? item.page : item.kind))).toEqual([
      "prev",
      1,
      "gap",
      4,
      5,
      6,
      "gap",
      9,
      "next",
    ]);
  });
});
