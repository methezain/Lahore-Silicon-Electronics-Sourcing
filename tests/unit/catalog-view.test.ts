import { describe, expect, it } from "vitest";
import { resolveCatalogView } from "../../src/lib/catalog-view";

describe("resolveCatalogView", () => {
  it("keeps a stored list or grid choice", () => {
    expect(resolveCatalogView("grid", true)).toBe("grid");
    expect(resolveCatalogView("list", false)).toBe("list");
  });

  it("defaults to list at 900px and above, and grid below", () => {
    expect(resolveCatalogView(null, true)).toBe("list");
    expect(resolveCatalogView(null, false)).toBe("grid");
    expect(resolveCatalogView("rows", true)).toBe("list");
    expect(resolveCatalogView("", false)).toBe("grid");
  });
});
