/**
 * Field Web Vitals. docs/engineering.md#performance-budgets.
 * The browser sends a metric. This module checks it and stores the path, never a buyer.
 * Order ids are stripped. Ratings use the web-vitals bands. `within_budget` uses the shop budgets.
 */

export const VITALS_PATH = "/api/vitals";

/** Reject a beacon larger than a single metric. */
export const VITALS_BODY_MAX = 512;

export const vitalNames = ["LCP", "INP", "CLS"] as const;
export type VitalName = (typeof vitalNames)[number];

export const vitalRatings = ["good", "needs-improvement", "poor"] as const;
export type VitalRating = (typeof vitalRatings)[number];

/** Upper edge of "good", then of "needs-improvement". Same bands as the web-vitals library. */
const ratingBands: Record<VitalName, readonly [number, number]> = {
  LCP: [2500, 4000],
  INP: [200, 500],
  CLS: [0.1, 0.25],
};

/** Shop budgets: LCP ≤ 2.0 s, INP ≤ 200 ms, CLS ≤ 0.05. */
const budgetCaps: Record<VitalName, number> = {
  LCP: 2000,
  INP: 200,
  CLS: 0.05,
};

const PATH_MAX = 80;

export type VitalSample = {
  name: VitalName;
  value: number;
  rating: VitalRating;
  withinBudget: boolean;
  path: string;
};

export interface VitalStatement {
  bind(...values: unknown[]): VitalStatement;
  run(): Promise<unknown>;
}

export interface VitalDatabase {
  prepare(sql: string): VitalStatement;
}

export function ratingFor(name: VitalName, value: number): VitalRating {
  const [good, poor] = ratingBands[name];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

export function withinBudget(name: VitalName, value: number): boolean {
  return value <= budgetCaps[name];
}

/** A pathname only. `/order-success/<id>` becomes `/order-success`. */
export function vitalPath(input: unknown): string | null {
  if (typeof input !== "string") return null;
  if (input.length < 1 || input.length > PATH_MAX) return null;
  if (!input.startsWith("/")) return null;
  if (input.includes("?") || input.includes("#") || input.includes("//") || input.includes("\\") || input.includes("..")) {
    return null;
  }
  if (!/^\/[A-Za-z0-9._/-]*$/.test(input)) return null;
  if (input.length > 1 && input.endsWith("/")) return null;
  if (/^\/order-success\/[^/]+$/.test(input)) return "/order-success";
  return input;
}

export function parseVital(input: unknown): VitalSample | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const body = input as Record<string, unknown>;
  if (typeof body.name !== "string" || !vitalNames.includes(body.name as VitalName)) return null;
  if (typeof body.value !== "number" || !Number.isFinite(body.value) || body.value < 0 || body.value > 60_000) {
    return null;
  }
  const path = vitalPath(body.path);
  if (!path) return null;
  const name = body.name as VitalName;
  return {
    name,
    value: body.value,
    rating: ratingFor(name, body.value),
    withinBudget: withinBudget(name, body.value),
    path,
  };
}

/** Read at most `VITALS_BODY_MAX` bytes. Returns null when the body is larger. */
export async function readVitalBody(request: Request): Promise<string | null> {
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > VITALS_BODY_MAX)) return null;
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > VITALS_BODY_MAX) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** 204 stored, 400 rejected, 413 too large, 503 not stored. */
export async function recordVital(db: VitalDatabase | undefined, input: unknown): Promise<204 | 400 | 503> {
  const sample = parseVital(input);
  if (!sample) return 400;
  if (!db) return 503;
  try {
    await db
      .prepare("INSERT INTO web_vitals (name, value, rating, within_budget, path) VALUES (?, ?, ?, ?, ?)")
      .bind(sample.name, sample.value, sample.rating, sample.withinBudget ? 1 : 0, sample.path)
      .run();
    return 204;
  } catch (error) {
    console.error("Vitals write failed:", error instanceof Error ? error.name : "unknown");
    return 503;
  }
}
