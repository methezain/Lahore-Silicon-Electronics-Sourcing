import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import type { AdminDatabase } from "../../lib/admin/db";
import { readMedia } from "../../lib/admin/media";

export const prerender = false;

const NAME = /^([a-z0-9][a-z0-9-]{3,80})-(112|640|1024)\.webp$/;

export const GET: APIRoute = async ({ params }) => {
  const match = NAME.exec(params.file ?? "");
  const db = env?.DB as unknown as AdminDatabase | undefined;
  if (!match || !db) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readMedia(db, match[1] as string, Number(match[2]));
    if (!bytes) return new Response("Not found", { status: 404 });
    return new Response(bytes.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(bytes.length),
      },
    });
  } catch (error) {
    console.error("Media read failed:", error instanceof Error ? error.name : "unknown");
    return new Response("Not found", { status: 404 });
  }
};
