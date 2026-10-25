import { dispatchZone } from "../clock";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** D1 `CURRENT_TIMESTAMP` is UTC `YYYY-MM-DD HH:MM:SS`; the audit and event stamps are ISO. */
export function parseStamp(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(\.\d+)?Z?$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(`${match[1]}T${match[2]}${match[3] ?? ""}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

type Local = { year: number; month: number; day: number; hour: number; minute: number; key: string };

export function karachiParts(date: Date, timeZone = dispatchZone): Local {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const year = get("year");
  const month = get("month");
  const day = get("day");
  return { year, month, day, hour: get("hour"), minute: get("minute"), key: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
}

export function dayKey(date: Date, timeZone = dispatchZone): string {
  return karachiParts(date, timeZone).key;
}

function two(value: number): string {
  return String(value).padStart(2, "0");
}

/** `Today, 11:42`, `Yesterday, 17:03`, or `22 Oct, 14:20` in Asia/Karachi. */
export function formatPlaced(value: unknown, now: Date = new Date()): string {
  const date = parseStamp(value);
  if (!date) return "";
  const local = karachiParts(date);
  const time = `${two(local.hour)}:${two(local.minute)}`;
  const today = karachiParts(now).key;
  const yesterday = dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  if (local.key === today) return `Today, ${time}`;
  if (local.key === yesterday) return `Yesterday, ${time}`;
  return `${local.day} ${MONTHS[local.month - 1]}, ${time}`;
}

/** `22 Oct 2026, 14:20` for the slip, the sheet and the CSV. */
export function formatFull(value: unknown): string {
  const date = parseStamp(value);
  if (!date) return "";
  const local = karachiParts(date);
  return `${local.day} ${MONTHS[local.month - 1]} ${local.year}, ${two(local.hour)}:${two(local.minute)}`;
}
