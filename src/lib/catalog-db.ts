import type { ImageMetadata } from "astro";
import { getCollection } from "astro:content";
import { env } from "cloudflare:workers";
import { fromBuildRecord, mapRow, type AssetResolver, type Product, type ProductRow } from "./catalog-map";

export const CATALOG_TTL_MS = import.meta.env.DEV ? 0 : 30_000;

const assets = import.meta.glob<ImageMetadata>("/src/assets/parts/**/*.webp", { eager: true, import: "default" });

const asset: AssetResolver = (path) => assets[`/src/assets/${path}`] ?? null;

type Shelf = { part_number: string; qty: number; restock_on: string | null };

type Reader = {
  prepare(sql: string): { bind(...values: unknown[]): { all<T>(): Promise<{ results: T[] }> } };
};

const PRODUCTS_SQL =
  "SELECT p.part_number, p.published, p.sort_order, p.data, s.qty AS qty, s.restock_on AS restock_on FROM products p LEFT JOIN stock s ON s.part_number = p.part_number ORDER BY p.sort_order, p.part_number";

type Snapshot = { all: Product[]; published: Product[] };

let cached: { at: number; snapshot: Promise<Snapshot> } | null = null;

async function fromBuild(db: Reader | undefined): Promise<Product[]> {
  const entries = await getCollection("components");
  let shelves = new Map<string, Shelf>();
  if (db) {
    try {
      const rows = await db.prepare("SELECT part_number, qty, restock_on FROM stock").bind().all<Shelf>();
      shelves = new Map(rows.results.map((row) => [row.part_number, row]));
    } catch (error) {
      console.error("Stock read failed:", error instanceof Error ? error.name : "unknown");
    }
  }
  return entries.map((entry, index) => fromBuildRecord(entry.data, index, shelves.get(entry.data.part_number)));
}

async function read(): Promise<Product[]> {
  const db = env?.DB as unknown as Reader | undefined;
  if (db) {
    try {
      const rows = await db.prepare(PRODUCTS_SQL).bind().all<ProductRow>();
      if (rows.results.length > 0) {
        return rows.results.map((row) => mapRow(row, asset)).filter((product): product is Product => product !== null);
      }
    } catch (error) {
      console.error("Product read failed:", error instanceof Error ? error.name : "unknown");
    }
  }
  return fromBuild(db);
}

/**
 * Every product, from D1 when it holds any and from the build-time records otherwise.
 * Cached in memory for 30 seconds per Worker instance. Orders re-check stock in D1.
 */
export async function getProducts(options: { all?: boolean } = {}): Promise<Product[]> {
  const now = Date.now();
  if (!cached || now - cached.at > CATALOG_TTL_MS) {
    const snapshot = read().then((all) => ({ all, published: all.filter((product) => product.published) }));
    cached = { at: now, snapshot };
    snapshot.catch(() => {
      if (cached?.snapshot === snapshot) cached = null;
    });
  }
  const snapshot = await cached.snapshot;
  return options.all ? snapshot.all : snapshot.published;
}

export async function getProduct(partNumber: string, options: { all?: boolean } = {}): Promise<Product | undefined> {
  const wanted = partNumber.toLowerCase();
  return (await getProducts(options)).find((product) => product.part_number.toLowerCase() === wanted);
}

/** Admin writes call this so the next read in this instance is fresh. Other instances catch up within the TTL. */
export function invalidateProducts(): void {
  cached = null;
}
