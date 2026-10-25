import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";
import { getProducts } from "./catalog-db";
import type { Product } from "./catalog-map";
import { isRemote, mediaUrl } from "./media";
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
  summary?: string;
  package_type: string;
  specs: CatalogSpec[];
  stock_qty: number;
  restock_on?: string;
  min_qty: number;
  qty_multiple: number;
  image?: string;
  /** Part numbers this record lists. Only ids the catalog still sells are shown. */
  companions?: string[];
};

/** WebP thumb for the cart island. Catalog and product pages render `<Picture>` themselves. */
export async function partThumbSrc(image: ImageMetadata): Promise<string> {
  if (isRemote(image)) return mediaUrl(image.media, 112);
  const result = await getImage({
    src: image,
    width: thumb56Source,
    height: thumb56Source,
    format: "webp",
  });
  return result.src;
}

const catalogMemo = new WeakMap<object, Promise<CatalogPart[]>>();

/** Published parts, priced by `price` until a record carries quantity breaks. */
export async function loadCatalog(): Promise<CatalogPart[]> {
  const products = await getProducts();
  const memo = catalogMemo.get(products);
  if (memo) return memo;
  const built = buildCatalog(products);
  catalogMemo.set(products, built);
  return built;
}

function buildCatalog(products: Product[]): Promise<CatalogPart[]> {
  return Promise.all(products.map(async (product) => ({
    part_number: product.part_number,
    mpn: product.mpn,
    name: product.name,
    category: product.category,
    voltage: product.voltage,
    summary: product.summary,
    package_type: product.package_type,
    specs: product.specs.map((spec) => ({
      value: spec.value,
      ...(spec.unit ? { unit: spec.unit } : {}),
    })),
    price: product.price,
    stock_qty: product.stock_qty,
    ...(product.restock_on ? { restock_on: product.restock_on } : {}),
    min_qty: product.min_qty,
    qty_multiple: product.qty_multiple,
    image: product.images?.[0] ? await partThumbSrc(product.images[0].src) : undefined,
    ...(product.breaks ? { breaks: product.breaks } : {}),
    ...(product.companions ? { companions: [...product.companions] } : {}),
  })));
}

/** Safe to embed in a script tag. Catalog names are ours; this still escapes `<`. */
export function catalogScriptJson(catalog: readonly CatalogPrice[]): string {
  return JSON.stringify(catalog).replaceAll("<", "\\u003c");
}
