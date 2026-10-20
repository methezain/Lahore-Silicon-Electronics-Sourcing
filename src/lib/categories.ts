export const CATEGORIES = ["Power", "Boards", "ICs", "Sensors", "Relays"] as const;

export type Category = (typeof CATEGORIES)[number];

/** Existing category colors, keyed by the catalog enum. */
export const categorySwatch: Record<
  Category,
  { bg: string; text: string; dark: string }
> = {
  Power: { bg: "#FFF7ED", text: "#D97706", dark: "#2A1A04" },
  Boards: { bg: "#EBF6FD", text: "#007AAD", dark: "#0C2A3F" },
  ICs: { bg: "#F5F3FF", text: "#7C3AED", dark: "#1E1040" },
  Sensors: { bg: "#F0FDF4", text: "#059669", dark: "#052B1A" },
  Relays: { bg: "#FFF1F2", text: "#E11D48", dark: "#2B0A14" },
};
