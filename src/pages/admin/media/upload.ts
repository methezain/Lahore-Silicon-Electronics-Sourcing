import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { adminActor } from "../../../lib/admin/constants";
import type { AdminDatabase } from "../../../lib/admin/db";
import { storeMedia, uploadMessages, type Variants } from "../../../lib/admin/media";
import { MEDIA_WIDTHS } from "../../../lib/media";

export const prerender = false;

const MAX_BODY = 2 * 1024 * 1024;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const POST: APIRoute = async ({ request }) => {
  const db = env?.DB as unknown as AdminDatabase | undefined;
  if (!db) return json({ error: uploadMessages.failed }, 500);
  const length = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(length) || length > MAX_BODY) return json({ error: uploadMessages.size }, 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: uploadMessages.missing }, 400);
  }

  const variants: Variants = {};
  for (const size of MEDIA_WIDTHS) {
    const file = form.get(`w${size}`);
    if (file instanceof File && file.size > 0) variants[size] = new Uint8Array(await file.arrayBuffer());
  }
  const result = await storeMedia(db, {
    partNumber: String(form.get("part_number") ?? "").slice(0, 40),
    width: Number(form.get("width")),
    height: Number(form.get("height")),
    variants,
    actor: adminActor,
  });
  if (!result.ok) return json({ error: uploadMessages[result.reason] }, result.reason === "failed" ? 500 : 400);
  return json({ key: result.key, width: result.width, height: result.height });
};
