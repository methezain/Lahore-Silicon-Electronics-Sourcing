/**
 * Parts for the catalog (`/`) and the brand page (`/home`).
 * Photos come from `images[0]`. Counts and prices stay on the part record.
 */
import { getProducts } from "./catalog-db";
import type { ImageMetadata } from "astro";
import type { HomePart } from "./home";
import type { PriceBreak } from "./money";

export type CounterPart = HomePart & {
  name: string;
  price: number;
  breaks?: readonly PriceBreak[];
  stock_qty: number;
  restock_on?: string;
  package_type: string;
  voltage?: string;
  image?: ImageMetadata;
  min_qty: number;
  qty_multiple: number;
};

export async function loadCounterParts(): Promise<CounterPart[]> {
  const products = await getProducts();
  return products.map((product) => ({
    part_number: product.part_number,
    category: product.category,
    featured: product.featured,
    name: product.name,
    price: product.price,
    breaks: product.breaks,
    stock_qty: product.stock_qty,
    restock_on: product.restock_on,
    package_type: product.package_type,
    voltage: product.voltage,
    image: product.images?.[0]?.src,
    min_qty: product.min_qty,
    qty_multiple: product.qty_multiple,
  }));
}
