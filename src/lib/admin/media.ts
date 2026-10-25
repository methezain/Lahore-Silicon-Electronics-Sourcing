import { MEDIA_KEY, MEDIA_WIDTHS, type MediaWidth } from "../media";
import { partSlug } from "../part-image";
import type { AdminDatabase } from "./db";

export const MAX_VARIANT_BYTES = 400 * 1024;
export const MIN_SIDE = 64;
export const MAX_SIDE = 4096;

export type UploadError = "type" | "size" | "dimensions" | "missing" | "failed";

export type UploadResult = { ok: true; key: string; width: number; height: number } | { ok: false; reason: UploadError };

export const uploadMessages: Record<UploadError, string> = {
  type: "Photos must be WebP, JPEG or PNG.",
  size: "That photo is too large to store.",
  dimensions: "That photo is too small or too large.",
  missing: "The photo did not arrive.",
  failed: "The photo was not saved. Try again.",
};

/** A WebP file starts with RIFF, a size, then WEBP. */
export function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 16) return false;
  const text = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  return text(0, 4) === "RIFF" && text(8, 12) === "WEBP";
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

export function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function newMediaKey(partNumber: string, random: Uint8Array = crypto.getRandomValues(new Uint8Array(4))): string {
  const slug = (partSlug(partNumber) || "photo").slice(0, 40);
  const suffix = Array.from(random, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${slug}-${suffix}`;
}

export type Variants = Partial<Record<MediaWidth, Uint8Array>>;

export async function storeMedia(
  db: AdminDatabase,
  input: { partNumber: string; width: number; height: number; variants: Variants; actor: string; key?: string },
): Promise<UploadResult> {
  const { width, height } = input;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < MIN_SIDE || height < MIN_SIDE || width > MAX_SIDE || height > MAX_SIDE) {
    return { ok: false, reason: "dimensions" };
  }
  for (const size of MEDIA_WIDTHS) {
    const bytes = input.variants[size];
    if (!bytes || bytes.length === 0) return { ok: false, reason: "missing" };
    if (!isWebp(bytes)) return { ok: false, reason: "type" };
    if (bytes.length > MAX_VARIANT_BYTES) return { ok: false, reason: "size" };
  }
  const key = input.key ?? newMediaKey(input.partNumber);
  if (!MEDIA_KEY.test(key)) return { ok: false, reason: "failed" };
  try {
    const statements = [
      db.prepare("INSERT INTO media (key, part_number, width, height) VALUES (?, ?, ?, ?)").bind(key, input.partNumber || null, width, height),
      ...MEDIA_WIDTHS.map((size) => {
        const bytes = input.variants[size] as Uint8Array;
        return db.prepare("INSERT INTO media_files (key, width, body, bytes) VALUES (?, ?, ?, ?)").bind(key, size, toBase64(bytes), bytes.length);
      }),
      db.prepare("INSERT INTO audit_log (actor, action, target, detail_json) VALUES (?, ?, ?, ?)").bind(input.actor, "media.upload", key, JSON.stringify({ part: input.partNumber, width, height })),
    ];
    await db.batch(statements);
    return { ok: true, key, width, height };
  } catch (error) {
    console.error("Media write failed:", error instanceof Error ? error.name : "unknown");
    return { ok: false, reason: "failed" };
  }
}

export async function readMedia(db: AdminDatabase, key: string, width: number): Promise<Uint8Array | null> {
  if (!MEDIA_KEY.test(key) || !(MEDIA_WIDTHS as readonly number[]).includes(width)) return null;
  const row = await db.prepare("SELECT body FROM media_files WHERE key = ? AND width = ?").bind(key, width).first<{ body: string }>();
  return row ? fromBase64(row.body) : null;
}

/** Keys that exist in the media table. A product may only reference these. */
export async function existingKeys(db: AdminDatabase, keys: readonly string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const marks = keys.map(() => "?").join(", ");
  const rows = await db.prepare(`SELECT key FROM media WHERE key IN (${marks})`).bind(...keys).all<{ key: string }>();
  return new Set(rows.results.map((row) => row.key));
}
