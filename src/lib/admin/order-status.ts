export const ORDER_STATUSES = ["Pending", "Paid", "Dispatched", "Delivered", "Cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const statusLabels: Record<OrderStatus, string> = {
  Pending: "Awaiting payment",
  Paid: "Paid",
  Dispatched: "Dispatched",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
};

export const statusChipClass: Record<OrderStatus, string> = {
  Pending: "awaiting",
  Paid: "paid",
  Dispatched: "dispatched",
  Delivered: "delivered",
  Cancelled: "cancelled",
};

const NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  Pending: ["Paid", "Cancelled"],
  Paid: ["Dispatched", "Cancelled"],
  Dispatched: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

export const moveLabels: Record<OrderStatus, string> = {
  Pending: "Mark as awaiting payment",
  Paid: "Mark as paid",
  Dispatched: "Mark as dispatched",
  Delivered: "Mark as delivered",
  Cancelled: "Cancel order",
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function nextStatuses(status: string): readonly OrderStatus[] {
  return isOrderStatus(status) ? NEXT[status] : [];
}

export function canMove(from: string, to: string): boolean {
  return isOrderStatus(to) && nextStatuses(from).includes(to);
}

export function statusLabel(status: string): string {
  return isOrderStatus(status) ? statusLabels[status] : status;
}

export function statusChip(status: string): string {
  return isOrderStatus(status) ? statusChipClass[status] : "awaiting";
}

/** Cancelling an order that has not shipped puts its parts back on the shelf by default. */
export function restockByDefault(from: string): boolean {
  return from === "Pending" || from === "Paid";
}

export type TimelineStep = { label: string; state: "done" | "now" | "todo" };

const FLOW = ["Pending", "Paid", "Dispatched", "Delivered"] as const;
const FLOW_LABELS = ["Awaiting payment", "Paid", "Dispatched", "Delivered"] as const;

/** Steps for the sheet. A cancelled order shows only that it was placed and cancelled. */
export function timelineSteps(status: string): TimelineStep[] {
  if (status === "Cancelled") {
    return [
      { label: "Order placed", state: "done" },
      { label: "Cancelled", state: "now" },
    ];
  }
  const at = FLOW.indexOf(status as (typeof FLOW)[number]);
  const index = at === -1 ? 0 : at;
  const steps: TimelineStep[] = [{ label: "Order placed", state: "done" }];
  FLOW.forEach((_, i) => {
    const state = status === "Delivered" || i < index ? "done" : i === index ? "now" : "todo";
    steps.push({ label: FLOW_LABELS[i] ?? "", state });
  });
  return steps;
}
