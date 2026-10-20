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

/** Same sentence as the defect section on the shipping page. */
export const returnRule = "Report a defect within 3 days of receiving the parcel.";

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
