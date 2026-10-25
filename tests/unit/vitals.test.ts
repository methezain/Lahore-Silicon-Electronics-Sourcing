import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import {
  parseVital,
  ratingFor,
  readVitalBody,
  recordVital,
  VITALS_PATH,
  withinBudget,
  type VitalDatabase,
} from "../../src/lib/vitals";

describe("vital samples", () => {
  it("posts to the shop endpoint", () => {
    expect(VITALS_PATH).toBe("/api/vitals");
  });

  it("rates with the web-vitals bands and the shop budgets", () => {
    expect(ratingFor("LCP", 2000)).toBe("good");
    expect(ratingFor("LCP", 3000)).toBe("needs-improvement");
    expect(ratingFor("LCP", 5000)).toBe("poor");
    expect(withinBudget("LCP", 2000)).toBe(true);
    expect(withinBudget("LCP", 2001)).toBe(false);
    expect(withinBudget("INP", 200)).toBe(true);
    expect(withinBudget("CLS", 0.05)).toBe(true);
    expect(withinBudget("CLS", 0.051)).toBe(false);
  });

  it("keeps a catalog path and drops an order id", () => {
    expect(parseVital({ name: "LCP", value: 1800, path: "/product/lm7805" })).toMatchObject({
      name: "LCP",
      value: 1800,
      rating: "good",
      withinBudget: true,
      path: "/product/lm7805",
    });
    expect(parseVital({ name: "CLS", value: 0.2, rating: "good", path: "/order-success/LHR-abc" })).toMatchObject({
      rating: "needs-improvement",
      withinBudget: false,
      path: "/order-success",
    });
  });

  it("rejects buyer fields, queries, and junk", () => {
    expect(parseVital({ name: "LCP", value: 1, path: "/checkout?phone=1" })).toBeNull();
    expect(parseVital({ name: "LCP", value: 1, path: "https://evil.example/" })).toBeNull();
    expect(parseVital({ name: "LCP", value: 1, path: "/order-success/../admin" })).toBeNull();
    expect(parseVital({ name: "FCP", value: 1, path: "/" })).toBeNull();
    expect(parseVital({ name: "INP", value: -1, path: "/" })).toBeNull();
    expect(parseVital({ name: "INP", value: Number.NaN, path: "/" })).toBeNull();
    expect(parseVital([])).toBeNull();
  });

  it("stops reading past the body cap", async () => {
    const small = new Request("https://shop.test/api/vitals", { method: "POST", body: "{\"name\":\"LCP\"}" });
    expect(await readVitalBody(small)).toBe("{\"name\":\"LCP\"}");
    const huge = new Request("https://shop.test/api/vitals", {
      method: "POST",
      body: "x".repeat(600),
    });
    expect(await readVitalBody(huge)).toBeNull();
  });
});

describe("vital writes", () => {
  function fakeDb(run: () => Promise<unknown> = async () => {}) {
    const calls: unknown[][] = [];
    const statement = {
      bind(...values: unknown[]) {
        calls.push(values);
        return statement;
      },
      run,
    };
    const db: VitalDatabase = { prepare: () => statement };
    return { db, calls };
  }

  it("stores the derived rating, not the one the browser sent", async () => {
    const { db, calls } = fakeDb();
    const status = await recordVital(db, { name: "INP", value: 180, rating: "poor", path: "/" });
    expect(status).toBe(204);
    expect(calls).toEqual([["INP", 180, "good", 1, "/"]]);
  });

  it("returns 400 for a bad sample and 503 when the database is missing", async () => {
    expect(await recordVital(fakeDb().db, { name: "nope" })).toBe(400);
    expect(await recordVital(undefined, { name: "LCP", value: 1, path: "/" })).toBe(503);
  });

  it("returns 503 when the write throws, without the path", async () => {
    const errors: unknown[] = [];
    const spy = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };
    try {
      const { db } = fakeDb(async () => {
        throw new Error("path /order-success/secret");
      });
      expect(await recordVital(db, { name: "CLS", value: 0, path: "/about" })).toBe(503);
    } finally {
      console.error = spy;
    }
    expect(JSON.stringify(errors)).not.toContain("secret");
    expect(JSON.stringify(errors)).toContain("Error");
  });
});

describe("web vitals table", () => {
  it("is in the forward migration and the schema", () => {
    const migration = readFileSync("db/migrations/0005_web_vitals.sql", "utf8");
    const schema = readFileSync("db/schema.sql", "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS web_vitals");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS web_vitals");
    expect(migration).not.toContain("DROP TABLE");
  });
});

describe("local D1 web vitals", () => {
  let db: D1Database;
  let dispose: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const proxy = await getPlatformProxy<{ DB: D1Database }>({
      configPath: "wrangler.jsonc",
      persist: false,
      remoteBindings: false,
      envFiles: [],
    });
    db = proxy.env.DB;
    dispose = () => proxy.dispose();
    const stripped = readFileSync("db/schema.sql", "utf8")
      .split("\n")
      .map((line) => (line.trim().startsWith("--") ? "" : line))
      .join("\n");
    const sql = stripped
      .split(";")
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n");
    await db.exec(sql);
  }, 120_000);

  afterAll(async () => {
    await dispose?.();
  });

  it("inserts one redacted row", async () => {
    const status = await recordVital(db as unknown as VitalDatabase, {
      name: "LCP",
      value: 1500,
      path: "/order-success/LHR-secret",
    });
    expect(status).toBe(204);
    const row = await db
      .prepare("SELECT name, value, rating, within_budget, path FROM web_vitals")
      .first<{ name: string; value: number; rating: string; within_budget: number; path: string }>();
    expect(row).toMatchObject({
      name: "LCP",
      value: 1500,
      rating: "good",
      within_budget: 1,
      path: "/order-success",
    });
    expect(JSON.stringify(row)).not.toContain("secret");
  }, 30_000);
});
