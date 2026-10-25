import type { ImageMetadata } from "astro";

/** Widths the admin uploader writes for every photo: cart thumb, product page, 2× product page. */
export const MEDIA_WIDTHS = [112, 640, 1024] as const;

export type MediaWidth = (typeof MEDIA_WIDTHS)[number];

/** A photo served from R2 by `/media`. It is already resized, so it skips astro:assets. */
export type PhotoSource = ImageMetadata & { remote?: true; media?: string };

const REF = /^media:([a-z0-9][a-z0-9-]{3,80})$/;
export const MEDIA_KEY = /^[a-z0-9][a-z0-9-]{3,80}$/;

export function mediaRef(key: string): string {
  return `media:${key}`;
}

export function parseMediaRef(ref: string): string | null {
  const match = REF.exec(ref);
  return match?.[1] ?? null;
}

export function mediaUrl(key: string, width: MediaWidth): string {
  return `/media/${key}-${width}.webp`;
}

export function mediaSource(key: string, width = 1024, height = 1024): PhotoSource {
  return { src: mediaUrl(key, 1024), width, height, format: "webp", remote: true, media: key };
}

export function isRemote(src: ImageMetadata): src is PhotoSource & { remote: true; media: string } {
  const candidate = src as PhotoSource;
  return candidate.remote === true && typeof candidate.media === "string";
}
