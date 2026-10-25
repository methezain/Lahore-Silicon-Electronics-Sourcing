export type Notice = { text: string; tone: "ok" | "low" | "out" };

const NOTICES: Record<string, Notice> = {
  paid: { text: "Marked as paid.", tone: "ok" },
  dispatched: { text: "Marked as dispatched.", tone: "ok" },
  delivered: { text: "Marked as delivered.", tone: "ok" },
  cancelled: { text: "Order cancelled.", tone: "ok" },
  "cancelled-restocked": { text: "Order cancelled. The parts are back on the shelf.", tone: "ok" },
  "note-saved": { text: "Note saved.", tone: "ok" },
  stale: { text: "This order changed on another screen. Showing its current status.", tone: "low" },
  invalid: { text: "That step is not allowed from this status.", tone: "out" },
  missing: { text: "No order with this id.", tone: "out" },
  "note-long": { text: "The note must be 500 characters or fewer.", tone: "out" },
  failed: { text: "Nothing was changed. Try again.", tone: "out" },
};

export function noticeFor(key: string | null | undefined): Notice | null {
  return key ? NOTICES[key] ?? null : null;
}

export function noticeKeyForMove(to: string, restocked: boolean): string {
  if (to === "Cancelled") return restocked ? "cancelled-restocked" : "cancelled";
  return to.toLowerCase();
}
