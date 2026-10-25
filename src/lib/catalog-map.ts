import type { ImageMetadata } from "astro";
import type { StoredProduct } from "./admin/product-schema";
import { storedProductSchema } from "./admin/product-schema";
import { mediaSource, parseMediaRef, type PhotoSource } from "./media";

export type ProductImage = {
  src: PhotoSource;
  alt: string;
  note?: string;
};

export type Product = Omit<StoredProduct, "images"> & {
  images?: ProductImage[];
  published: boolean;
  sort_order: number;
  /** True when the first photo is a build asset, which has a share image under public/og. */
  hasOg: boolean;
};

export type ProductRow = {
  part_number: string;
  published: number;
  sort_order: number;
  data: string;
  qty: number | null;
  restock_on: string | null;
};

export type AssetResolver = (path: string) => ImageMetadata | null;

const ASSET = /^asset:(.+)$/;

type StoredImage = NonNullable<StoredProduct["images"]>[number];

function resolveImage(image: StoredImage, asset: AssetResolver): ProductImage | null {
  const key = parseMediaRef(image.src);
  const base = { alt: image.alt, ...(image.note ? { note: image.note } : {}) };
  if (key) return { src: mediaSource(key, image.width, image.height), ...base };
  const path = ASSET.exec(image.src)?.[1];
  const found = path ? asset(path) : null;
  return found ? { src: found, ...base } : null;
}

/** Turns a stored record plus its shelf row into the object every page reads. */
export function toProduct(
  data: StoredProduct,
  extra: { published: boolean; sort_order: number; qty: number | null; restock_on: string | null },
  asset: AssetResolver,
): Product {
  const images = (data.images ?? []).map((image) => resolveImage(image, asset)).filter((image): image is ProductImage => image !== null);
  const { images: _stored, ...rest } = data;
  const restockOn = extra.qty !== null ? (extra.restock_on ?? undefined) : data.restock_on;
  return {
    ...rest,
    stock_qty: extra.qty ?? data.stock_qty,
    restock_on: restockOn,
    ...(images.length > 0 ? { images } : {}),
    published: extra.published,
    sort_order: extra.sort_order,
    hasOg: data.images?.[0]?.src.startsWith("asset:") ?? false,
  };
}

export function mapRow(row: ProductRow, asset: AssetResolver): Product | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.data);
  } catch {
    console.error("Product row is not JSON:", row.part_number);
    return null;
  }
  const checked = storedProductSchema.safeParse(parsed);
  if (!checked.success) {
    console.error("Product row failed validation:", row.part_number);
    return null;
  }
  if (checked.data.part_number !== row.part_number) {
    console.error("Product row key does not match its record:", row.part_number);
    return null;
  }
  return toProduct(
    checked.data,
    { published: row.published === 1, sort_order: row.sort_order, qty: row.qty, restock_on: row.restock_on },
    asset,
  );
}

/** A record from the build-time collection: photos are already image metadata. */
export function fromBuildRecord(
  data: Omit<StoredProduct, "images"> & { images?: { src: ImageMetadata; alt: string; note?: string }[] },
  index: number,
  shelf: { qty: number; restock_on: string | null } | undefined,
): Product {
  return {
    ...data,
    stock_qty: shelf?.qty ?? data.stock_qty,
    restock_on: shelf ? (shelf.restock_on ?? undefined) : data.restock_on,
    published: true,
    sort_order: index,
    hasOg: Boolean(data.images?.[0]),
  };
}

export type { StoredProduct };
