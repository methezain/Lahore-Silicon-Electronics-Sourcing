import { dispatchZone } from "../clock";
import { DEFAULT_LOW_STOCK_AT } from "../stock";
import type { AdminDatabase } from "./db";
import { dayKey, karachiParts } from "./time";

export const CHART_DAYS = 30;
export const CONFIRMED = ["Paid", "Dispatched", "Delivered"] as const;

export type DayPoint = { day: string; sales: number; orders: number };

export type TopPart = { part_number: string; units: number };

export type RecentOrder = {
  id: string;
  customer_name: string;
  destination: string | null;
  total_price: number;
  status: string;
  created_at: string | null;
  lines: number;
};

export type LowStockRow = { part_number: string; qty: number };

export type Overview = {
  today: { key: string; booked: number; confirmedSales: number };
  weekSales: number;
  monthSales: number;
  awaiting: { count: number; oldestHours: number | null };
  toDispatch: number;
  days: DayPoint[];
  rangeSales: number;
  topParts: TopPart[];
  recent: RecentOrder[];
  lowStock: LowStockRow[];
};

function sqlStamp(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

/** Minutes the zone is ahead of UTC at that instant. */
export function zoneOffsetMinutes(date: Date, timeZone = dispatchZone): number {
  const local = karachiParts(date, timeZone);
  const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  return Math.round((asUtc - Math.floor(date.getTime() / 60000) * 60000) / 60000);
}

/** The UTC instant at which a local day (`YYYY-MM-DD`) begins. */
export function dayStartUtc(key: string, timeZone = dispatchZone): Date {
  const [year = 0, month = 1, day = 1] = key.split("-").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day));
  return new Date(guess.getTime() - zoneOffsetMinutes(guess, timeZone) * 60000);
}

/** `YYYY-MM-DD` n days before the given key, by calendar arithmetic. */
export function shiftDay(key: string, days: number): string {
  const [year = 0, month = 1, day = 1] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function monthStartKey(key: string): string {
  return `${key.slice(0, 8)}01`;
}

/** One entry per local day, oldest first, with zeros for days without sales. */
export function fillDays(rows: readonly DayPoint[], todayKey: string, count = CHART_DAYS): DayPoint[] {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const days: DayPoint[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const key = shiftDay(todayKey, -i);
    days.push(byDay.get(key) ?? { day: key, sales: 0, orders: 0 });
  }
  return days;
}

const CONFIRMED_SQL = CONFIRMED.map((status) => `'${status}'`).join(", ");

export async function overview(db: AdminDatabase, now: Date = new Date()): Promise<Overview> {
  const todayKey = dayKey(now);
  const todayStart = sqlStamp(dayStartUtc(todayKey));
  const weekStart = sqlStamp(dayStartUtc(shiftDay(todayKey, -6)));
  const monthStart = sqlStamp(dayStartUtc(monthStartKey(todayKey)));
  const rangeStart = sqlStamp(dayStartUtc(shiftDay(todayKey, -(CHART_DAYS - 1))));
  const offset = `${zoneOffsetMinutes(now) >= 0 ? "+" : "-"}${Math.abs(zoneOffsetMinutes(now))} minutes`;

  const sums = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN status != 'Cancelled' AND created_at >= ? THEN 1 ELSE 0 END), 0) AS booked_today,
         COALESCE(SUM(CASE WHEN status IN (${CONFIRMED_SQL}) AND created_at >= ? THEN total_price ELSE 0 END), 0) AS sales_today,
         COALESCE(SUM(CASE WHEN status IN (${CONFIRMED_SQL}) AND created_at >= ? THEN total_price ELSE 0 END), 0) AS sales_week,
         COALESCE(SUM(CASE WHEN status IN (${CONFIRMED_SQL}) AND created_at >= ? THEN total_price ELSE 0 END), 0) AS sales_month,
         COALESCE(SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END), 0) AS awaiting,
         MIN(CASE WHEN status = 'Pending' THEN created_at END) AS oldest_pending,
         COALESCE(SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END), 0) AS to_dispatch
       FROM Orders`,
    )
    .bind(todayStart, todayStart, weekStart, monthStart)
    .first<{
      booked_today: number;
      sales_today: number;
      sales_week: number;
      sales_month: number;
      awaiting: number;
      oldest_pending: string | null;
      to_dispatch: number;
    }>();

  const daily = db
    .prepare(
      `SELECT date(created_at, ?) AS day, COALESCE(SUM(total_price), 0) AS sales, COUNT(*) AS orders
       FROM Orders WHERE status IN (${CONFIRMED_SQL}) AND created_at >= ? GROUP BY day`,
    )
    .bind(offset, rangeStart)
    .all<DayPoint>();

  const top = db
    .prepare(
      `SELECT json_extract(j.value, '$.part_number') AS part_number, SUM(json_extract(j.value, '$.quantity')) AS units
       FROM Orders o, json_each(CASE WHEN json_valid(o.items_json) THEN o.items_json ELSE '[]' END) j
       WHERE o.status != 'Cancelled' AND o.created_at >= ?
       GROUP BY part_number ORDER BY units DESC, part_number LIMIT 5`,
    )
    .bind(rangeStart)
    .all<TopPart>();

  const recent = db
    .prepare(
      `SELECT id, customer_name, destination, total_price, status, created_at,
         CASE WHEN json_valid(items_json) THEN json_array_length(items_json) ELSE 0 END AS lines
       FROM Orders ORDER BY created_at DESC, id DESC LIMIT 5`,
    )
    .bind()
    .all<RecentOrder>();

  const low = db
    .prepare("SELECT part_number, qty FROM stock WHERE qty <= ? ORDER BY qty, part_number LIMIT 8")
    .bind(DEFAULT_LOW_STOCK_AT)
    .all<LowStockRow>();

  const [sumRow, dailyRows, topRows, recentRows, lowRows] = await Promise.all([
    sums,
    daily,
    top,
    recent,
    low,
  ]);

  const days = fillDays(dailyRows.results, todayKey);
  const oldest = sumRow?.oldest_pending ? Date.parse(`${sumRow.oldest_pending.replace(" ", "T")}Z`) : NaN;
  return {
    today: { key: todayKey, booked: sumRow?.booked_today ?? 0, confirmedSales: sumRow?.sales_today ?? 0 },
    weekSales: sumRow?.sales_week ?? 0,
    monthSales: sumRow?.sales_month ?? 0,
    awaiting: {
      count: sumRow?.awaiting ?? 0,
      oldestHours: Number.isNaN(oldest) ? null : Math.max(0, Math.floor((now.getTime() - oldest) / 3600000)),
    },
    toDispatch: sumRow?.to_dispatch ?? 0,
    days,
    rangeSales: days.reduce((sum, day) => sum + day.sales, 0),
    topParts: topRows.results,
    recent: recentRows.results,
    lowStock: lowRows.results,
  };
}

/** Top of the chart: 1, 2, 4, 5, 6, 8 or 10 times a power of ten at or above the largest bar, so the middle gridline is a tidy number. */
export function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1000;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 4, 5, 6, 8, 10]) {
    if (value <= step * power) return step * power;
  }
  return 10 * power;
}

export function axisLabel(value: number): string {
  if (value === 0) return "0";
  return value >= 1000 ? `${Number((value / 1000).toFixed(1))}k` : String(value);
}
