/**
 * Dispatch countdown for the hero status chip and the product ETA line.
 * Rules: docs/commerce.md#delivery. Words: docs/copy.md#microcopy.
 * Cutoff is 3:00 PM PKT, Monday to Saturday. Sundays are skipped.
 * `dispatchHolidays` stays empty until the owner lists dates (docs/decisions.md item 10).
 * An unreadable instant omits the chip.
 */

export const dispatchZone = "Asia/Karachi";

/** 15:00 in `dispatchZone`. Paid before this on a dispatch day ships the same day. */
export const cutoffHour = 15;
export const cutoffMinute = 0;

/** `YYYY-MM-DD` in Asia/Karachi. These dates are not dispatch days. */
export const dispatchHolidays: readonly string[] = [];

const DAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const LOOKAHEAD_DAYS = 366;

export type DispatchKind = "today" | "next" | "closed" | "unknown";

export type DispatchClock = {
  kind: DispatchKind;
  /** Hero chip. Null when the instant cannot be read. */
  chip: string | null;
  /** Product ETA lead. Null when the instant cannot be read. */
  eta: string | null;
  /** Bold countdown, e.g. "3 h 12 m". Null when today is not counting down. */
  within: string | null;
};

type Civil = {
  year: number;
  month: number;
  day: number;
  weekday: number;
};

type Wall = Civil & {
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

let wallFormat: Intl.DateTimeFormat | undefined;

function formatter(): Intl.DateTimeFormat {
  wallFormat ??= new Intl.DateTimeFormat("en-US", {
    timeZone: dispatchZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  return wallFormat;
}

function unknown(): DispatchClock {
  return { kind: "unknown", chip: null, eta: null, within: null };
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseIso(value: string): Civil | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) return null;
  return { year, month, day, weekday: utc.getUTCDay() };
}

function holidaySet(holidays: readonly string[]): Set<string> {
  const dates = new Set<string>();
  for (const holiday of holidays) {
    if (typeof holiday !== "string") continue;
    const parsed = parseIso(holiday);
    if (parsed) dates.add(iso(parsed.year, parsed.month, parsed.day));
  }
  return dates;
}

function shift(year: number, month: number, day: number, days: number): Civil {
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
    weekday: utc.getUTCDay(),
  };
}

function isDispatchDay(date: Civil, holidays: Set<string>): boolean {
  return date.weekday !== 0 && !holidays.has(iso(date.year, date.month, date.day));
}

function dayName(weekday: number): string | null {
  return DAY_NAME[weekday] ?? null;
}

function nextDispatch(date: Civil, holidays: Set<string>): { name: string; tomorrow: boolean } | null {
  for (let offset = 1; offset <= LOOKAHEAD_DAYS; offset += 1) {
    const candidate = shift(date.year, date.month, date.day, offset);
    if (!isDispatchDay(candidate, holidays)) continue;
    const name = dayName(candidate.weekday);
    if (!name) return null;
    return { name, tomorrow: offset === 1 };
  }
  return null;
}

function wallClock(now: Date): Wall | null {
  if (Number.isNaN(now.getTime())) return null;
  const value: Record<string, string> = {};
  for (const part of formatter().formatToParts(now)) {
    if (part.type !== "literal") value[part.type] = part.value;
  }

  const weekday = WEEKDAY_INDEX[value.weekday ?? ""];
  const year = Number(value.year);
  const month = Number(value.month);
  const day = Number(value.day);
  const hour = Number(value.hour);
  const minute = Number(value.minute);
  const second = Number(value.second);
  if (
    weekday === undefined ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second)
  ) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31 || minute > 59 || second > 59) return null;

  let resolved = { year, month, day, weekday, hour, minute, second };
  if (hour === 24) resolved = { ...shift(year, month, day, 1), hour: 0, minute, second };
  if (resolved.hour < 0 || resolved.hour > 23) return null;

  return { ...resolved, millisecond: now.getMilliseconds() };
}

/** Whole minutes still inside the cutoff. Under one minute, say so instead of claiming a full minute. */
function formatWithin(remainingMs: number): string {
  const wholeMinutes = Math.floor(remainingMs / 60_000);
  if (wholeMinutes < 1) return "less than 1 m";
  const hours = Math.floor(wholeMinutes / 60);
  const minutes = wholeMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours} h ${minutes} m`;
  if (hours > 0) return `${hours} h`;
  return `${minutes} m`;
}

function remainingMs(wall: Wall): number {
  const cutoff = ((cutoffHour * 60 + cutoffMinute) * 60) * 1000;
  const elapsed = ((wall.hour * 60 + wall.minute) * 60 + wall.second) * 1000 + wall.millisecond;
  return cutoff - elapsed;
}

/**
 * Status chip and ETA lead for one instant.
 * Pass a `Date` in tests. Call with no arguments to read the real clock.
 */
export function dispatchClock(now: Date = new Date(), holidays: readonly string[] = dispatchHolidays): DispatchClock {
  let wall: Wall | null;
  try {
    wall = wallClock(now);
  } catch {
    return unknown();
  }
  if (!wall) return unknown();

  const closed = holidaySet(holidays);
  const openToday = isDispatchDay(wall, closed);
  const left = remainingMs(wall);

  if (openToday && left > 0) {
    const within = formatWithin(left);
    return {
      kind: "today",
      chip: `Dispatching today · order within ${within}`,
      eta: `Order within ${within}`,
      within,
    };
  }

  const next = nextDispatch(wall, closed);
  if (!next) return unknown();

  if (!openToday) {
    const text = `Dispatch resumes ${next.name}`;
    return { kind: "closed", chip: text, eta: text, within: null };
  }

  const when = next.tomorrow ? "tomorrow" : next.name;
  const text = `Order now for dispatch ${when}`;
  return { kind: "next", chip: text, eta: text, within: null };
}
