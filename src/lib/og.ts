/** Share-image paths. Files are written to public/og by scripts/og-images.mjs. */
import { partSlug } from "./part-image";

export function ogPath(partNumber?: string): string {
  const slug = partNumber ? partSlug(partNumber) : "";
  return slug ? `/og/${slug}.png` : "/og/default.png";
}
