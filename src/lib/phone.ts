/** Pakistani mobile numbers, stored as E.164 `+92` and 10 digits. */

export const phoneRule = "Enter a Pakistani mobile number, 03XX XXXXXXX.";

/**
 * Accepts `03XXXXXXXXX`, `3XXXXXXXXX`, and the same number already written with country code `92`.
 * Returns `+923XXXXXXXXX`, or undefined when the number is not that mobile.
 */
export function normalizePkMobile(raw: string): string | undefined {
  const compact = raw.trim().replace(/[\s\-()]/g, "");
  if (!compact) return undefined;

  let digits = compact.startsWith("+") ? compact.slice(1) : compact;
  if (!/^\d+$/.test(digits)) return undefined;
  if (digits.startsWith("92")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!/^3\d{9}$/.test(digits)) return undefined;
  return `+92${digits}`;
}
