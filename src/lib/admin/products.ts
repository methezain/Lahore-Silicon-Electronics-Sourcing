import { partSlug } from "../part-image";
import { recordAuditStatement } from "./audit";
import { changesOf, type AdminDatabase } from "./db";
import { errorsFromIssues, recordFromValues, type FieldErrors, type ProductValues } from "./product-form";
import { storedProductSchema, type StoredProduct } from "./product-schema";
import { existingKeys } from "./media";
import { parseMediaRef } from "../media";

export const PART_NUMBER = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/;

export type ProductListRow = {
  part_number: string;
  category: string;
  price: number;
  published: number;
  name: string | null;
  image: string | null;
  qty: number | null;
};

export async function listProducts(db: AdminDatabase): Promise<ProductListRow[]> {
  const rows = await db
    .prepare(
      "SELECT p.part_number, p.category, p.price, p.published, json_extract(p.data, '$.name') AS name, json_extract(p.data, '$.images[0].src') AS image, s.qty AS qty FROM products p LEFT JOIN stock s ON s.part_number = p.part_number ORDER BY p.sort_order, p.part_number",
    )
    .bind()
    .all<ProductListRow>();
  return rows.results;
}

export type StoredRow = { part_number: string; published: number; data: string; updated_at: string; qty: number | null };

export async function readProduct(db: AdminDatabase, partNumber: string): Promise<{ record: StoredProduct; published: boolean; updatedAt: string; qty: number } | null> {
  const row = await db
    .prepare("SELECT p.part_number, p.published, p.data, p.updated_at, s.qty AS qty FROM products p LEFT JOIN stock s ON s.part_number = p.part_number WHERE lower(p.part_number) = lower(?)")
    .bind(partNumber)
    .first<StoredRow>();
  if (!row) return null;
  const parsed = storedProductSchema.safeParse(JSON.parse(row.data));
  if (!parsed.success) return null;
  return { record: parsed.data, published: row.published === 1, updatedAt: row.updated_at, qty: row.qty ?? 0 };
}

export type Validation = { ok: true; record: StoredProduct } | { ok: false; errors: FieldErrors };

/** Schema, then the checks the schema cannot make: part number shape, uniqueness, companions and photo references. */
export async function validateProduct(
  db: AdminDatabase,
  values: ProductValues,
  mode: "create" | "update",
  existing?: StoredProduct,
): Promise<Validation> {
  const errors: FieldErrors = {};
  const qty = mode === "create" ? Number(values.initial_qty) : (existing?.stock_qty ?? 0);
  if (mode === "create") {
    if (!PART_NUMBER.test(values.part_number)) errors.part_number = "Use letters, numbers and - . _ only, up to 40 characters.";
    if (!/^\d{1,7}$/.test(values.initial_qty)) errors.initial_qty = "Enter a whole number of 0 or more.";
  }
  const parsed = storedProductSchema.safeParse(recordFromValues(values, Number.isFinite(qty) ? qty : 0));
  if (!parsed.success) Object.assign(errors, errorsFromIssues(parsed.error.issues));

  if (mode === "create" && !errors.part_number) {
    const taken = await db.prepare("SELECT part_number FROM products WHERE lower(part_number) = lower(?)").bind(values.part_number).first();
    if (taken || !partSlug(values.part_number)) errors.part_number = "A part with this number already exists.";
  }

  const mediaKeys = values.images.map((image) => parseMediaRef(image.src)).filter((key): key is string => key !== null);
  const known = await existingKeys(db, mediaKeys);
  const allowedAssets = new Set((existing?.images ?? []).map((image) => image.src));
  values.images.forEach((image, index) => {
    const key = parseMediaRef(image.src);
    const allowed = key ? known.has(key) : allowedAssets.has(image.src);
    if (!allowed) errors[`images.${index}.src`] = "This photo was not uploaded here. Remove it and upload it again.";
  });

  if (values.companions.length > 0) {
    const others = await db.prepare("SELECT part_number FROM products").bind().all<{ part_number: string }>();
    const parts = new Set(others.results.map((row) => row.part_number));
    values.companions.forEach((part, index) => {
      if (part === values.part_number) errors[`companions.${index}`] = "A part cannot list itself.";
      else if (!parts.has(part)) errors[`companions.${index}`] = "That part does not exist.";
    });
  }

  if (Object.keys(errors).length > 0 || !parsed.success) return { ok: false, errors };
  return { ok: true, record: parsed.data };
}

export type SaveResult = { ok: true; part_number: string } | { ok: false; reason: "exists" | "stale" | "missing" | "failed" };

const INSERT_PRODUCT =
  "INSERT INTO products (part_number, category, price, published, sort_order, data) VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM products), ?)";

/** The product, its shelf row and the audit row are written together, so a product can always be bought. */
export async function createProduct(
  db: AdminDatabase,
  input: { record: StoredProduct; published: boolean; qty: number; actor: string },
): Promise<SaveResult> {
  const { record } = input;
  try {
    await db.batch([
      db.prepare(INSERT_PRODUCT).bind(record.part_number, record.category, record.price, input.published ? 1 : 0, JSON.stringify(record)),
      db.prepare("INSERT INTO stock (part_number, qty) VALUES (?, ?)").bind(record.part_number, input.qty),
      db.prepare("INSERT INTO audit_log (actor, action, target, detail_json) VALUES (?, ?, ?, ?)").bind(input.actor, "product.create", record.part_number, JSON.stringify({ price: record.price, qty: input.qty })),
      ...(record.images ?? []).flatMap((image) => {
        const key = parseMediaRef(image.src);
        return key ? [db.prepare("UPDATE media SET part_number = ? WHERE key = ?").bind(record.part_number, key)] : [];
      }),
    ]);
    return { ok: true, part_number: record.part_number };
  } catch (error) {
    const text = error instanceof Error ? error.message : "";
    if (/UNIQUE|PRIMARY KEY/i.test(text)) return { ok: false, reason: "exists" };
    console.error("Product create failed:", error instanceof Error ? error.name : "unknown");
    return { ok: false, reason: "failed" };
  }
}

export async function updateProduct(
  db: AdminDatabase,
  input: { record: StoredProduct; published: boolean; expectedUpdatedAt: string; actor: string },
): Promise<SaveResult> {
  const { record } = input;
  const stamp = new Date().toISOString();
  try {
    const results = await db.batch([
      db
        .prepare("UPDATE products SET category = ?, price = ?, published = ?, data = ?, updated_at = ? WHERE part_number = ? AND updated_at = ?")
        .bind(record.category, record.price, input.published ? 1 : 0, JSON.stringify(record), stamp, record.part_number, input.expectedUpdatedAt),
      recordAuditStatement(db, { actor: input.actor, action: "product.update", target: record.part_number, detail: { price: record.price, published: input.published } }),
      ...(record.images ?? []).flatMap((image) => {
        const key = parseMediaRef(image.src);
        return key ? [db.prepare("UPDATE media SET part_number = ? WHERE key = ?").bind(record.part_number, key)] : [];
      }),
    ]);
    if (changesOf(results[0]) === 1) return { ok: true, part_number: record.part_number };
    const row = await db.prepare("SELECT part_number FROM products WHERE part_number = ?").bind(record.part_number).first();
    return { ok: false, reason: row ? "stale" : "missing" };
  } catch (error) {
    console.error("Product update failed:", error instanceof Error ? error.name : "unknown");
    return { ok: false, reason: "failed" };
  }
}

/** Hide, never delete: orders keep pointing at the part number. */
export async function setPublished(db: AdminDatabase, input: { partNumber: string; published: boolean; actor: string }): Promise<boolean> {
  try {
    const results = await db.batch([
      db.prepare("UPDATE products SET published = ?, updated_at = ? WHERE part_number = ?").bind(input.published ? 1 : 0, new Date().toISOString(), input.partNumber),
      recordAuditStatement(db, { actor: input.actor, action: input.published ? "product.publish" : "product.hide", target: input.partNumber }),
    ]);
    return changesOf(results[0]) === 1;
  } catch (error) {
    console.error("Product publish failed:", error instanceof Error ? error.name : "unknown");
    return false;
  }
}
