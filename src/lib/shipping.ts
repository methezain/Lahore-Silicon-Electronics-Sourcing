/**
 * Dispatch and delivery, taken from the shipping page.
 * Pages render these strings. They do not retype the windows.
 */

export const cutoffValue = "3:00 PM PKT, Monday to Saturday";
export const cutoffShort = "3 PM";
export const cutoffDays = "Monday to Saturday, PKT";

export const dispatchCutoff = `Dispatch cutoff ${cutoffValue}.`;

export const sameDayDispatch =
  "Orders paid before 3:00 PM PKT, Monday to Saturday, are dispatched the same day.";

export const lahoreWindow = "1 business day";
export const nationwideWindow = "48–72 hours";

export const lahoreDelivery = `Lahore: ${lahoreWindow}, by Bykea or a local courier.`;
export const nationwideDelivery = `Nationwide: ${nationwideWindow}.`;
export const orderBy = "Order by 3:00 PM PKT, Monday–Saturday.";

export const shippingWindows = `${lahoreDelivery} ${nationwideDelivery} ${orderBy}`;

/** No rupee amount is known. Do not print a blank or invent one. */
export const deliveryCost = "Delivery cost is confirmed from your city, before you pay.";

/** Commerce manual. Qualified, and not a promised date. */
export const remoteDelivery = "Remote areas and Eid periods may add 1–2 days.";

/**
 * Owner: no cash on delivery (docs/decisions.md).
 * Pickup is not a checkout choice, so this does not describe one.
 * Delivery is not a rupee line until a real rate table exists.
 */
export const noCashOnDelivery =
  "There is no cash on delivery. Pay the total shown before the order is dispatched.";

/** Owner: 24 hours, and WhatsApp first (docs/decisions.md). Not a change-of-mind return. */
export const returnRule = "Report a defect within 24 hours of receiving the parcel.";

/** The second sentence of the return rule. Shown with `returnRule` on the policy page. */
export const defectNotice = "Message us on WhatsApp first.";

/** Hero fact. The full sentences are `returnRule` and `defectNotice`. */
export const defectFact = "Report within 24 hours";

export const clockRows = [
  {
    label: "Dispatch cutoff",
    value: cutoffValue,
    detail: sameDayDispatch,
  },
  {
    label: "Lahore",
    value: lahoreWindow,
    detail: "By Bykea or a local courier.",
  },
  {
    label: "Nationwide",
    value: nationwideWindow,
    detail: "Via Leopards, TCS, or Trax.",
  },
] as const;
