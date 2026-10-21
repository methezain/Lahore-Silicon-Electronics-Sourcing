/**
 * Parts for the catalog (`/`) and the brand page (`/home`).
 * Photos come from `images[0]`. Counts and prices stay on the part record.
 */
import { getCollection } from "astro:content";
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
  const components = await getCollection("components");
  return components.map((entry) => ({
    part_number: entry.data.part_number,
    category: entry.data.category,
    featured: entry.data.featured,
    name: entry.data.name,
    price: entry.data.price,
    breaks: entry.data.breaks,
    stock_qty: entry.data.stock_qty,
    restock_on: entry.data.restock_on,
    package_type: entry.data.package_type,
    voltage: entry.data.voltage,
    image: entry.data.images?.[0]?.src,
    min_qty: entry.data.min_qty,
    qty_multiple: entry.data.qty_multiple,
  }));
}
