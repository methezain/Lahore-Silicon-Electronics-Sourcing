/**
 * Field Web Vitals beacon. Same-origin POST, no buyer fields.
 * docs/engineering.md#performance-budgets.
 */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { readVitalBody, recordVital, type VitalDatabase } from "../../lib/vitals";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let text: string | null;
  try {
    text = await readVitalBody(request);
  } catch (error) {
    console.error("Vitals body failed:", error instanceof Error ? error.name : "unknown");
    return new Response(null, { status: 400 });
  }
  if (text === null) return new Response(null, { status: 413 });
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const status = await recordVital(env?.DB as VitalDatabase | undefined, payload);
  return new Response(null, { status });
};
