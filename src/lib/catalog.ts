import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";
import { getCollection } from "astro:content";
import { thumb56Source } from "./part-image";
import type { CatalogPrice } from "./money";

export type CatalogSpec = {
  value: string;
  unit?: string;
};

export type CatalogPart = CatalogPrice & {
  mpn: string;
  category: string;
  voltage?: string;
  package_type: string;
  specs: CatalogSpec[];
  stock_qty: number;
  restock_on?: string;
  min_qty: number;
  qty_multiple: number;
  image?: string;
};

/** WebP thumb for the cart island. Catalog and product pages render `<Picture>` themselves. */
export async function partThumbSrc(image: ImageMetadata): Promise<string> {
  const result = await getImage({
    src: image,
    width: thumb56Source,
    height: thumb56Source,
    format: "webp",
  });
  return result.src;
}

/** Published parts, priced by `price` until a record carries quantity breaks. */
export async function loadCatalog(): Promise<CatalogPart[]> {
  const components = await getCollection("components");
  return Promise.all(components.map(async (entry) => ({
    part_number: entry.data.part_number,
    mpn: entry.data.mpn,
    name: entry.data.name,
    category: entry.data.category,
    voltage: entry.data.voltage,
    package_type: entry.data.package_type,
    specs: entry.data.specs.map((spec) => ({
      value: spec.value,
      ...(spec.unit ? { unit: spec.unit } : {}),
    })),
    price: entry.data.price,
    stock_qty: entry.data.stock_qty,
    ...(entry.data.restock_on ? { restock_on: entry.data.restock_on } : {}),
    min_qty: entry.data.min_qty,
    qty_multiple: entry.data.qty_multiple,
    image: entry.data.image ? await partThumbSrc(entry.data.image) : undefined,
  })));
}

/** Safe to embed in a script tag. Catalog names are ours; this still escapes `<`. */
export function catalogScriptJson(catalog: readonly CatalogPrice[]): string {
  return JSON.stringify(catalog).replaceAll("<", "\\u003c");
}
