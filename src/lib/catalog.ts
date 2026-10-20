import { getCollection } from "astro:content";
import type { CatalogPrice } from "./money";

export type CatalogPart = CatalogPrice & {
  mpn: string;
  category: string;
  voltage?: string;
  package_type: string;
  stock_qty: number;
  min_qty: number;
  qty_multiple: number;
};

/** Published parts, priced by `price` until a record carries quantity breaks. */
export async function loadCatalog(): Promise<CatalogPart[]> {
  const components = await getCollection("components");
  return components.map((entry) => ({
    part_number: entry.data.part_number,
    mpn: entry.data.mpn,
    name: entry.data.name,
    category: entry.data.category,
    voltage: entry.data.voltage,
    package_type: entry.data.package_type,
    price: entry.data.price,
    stock_qty: entry.data.stock_qty,
    min_qty: entry.data.min_qty,
    qty_multiple: entry.data.qty_multiple,
  }));
}

/** Safe to embed in a script tag. Catalog names are ours; this still escapes `<`. */
export function catalogScriptJson(catalog: readonly CatalogPrice[]): string {
  return JSON.stringify(catalog).replaceAll("<", "\\u003c");
}
