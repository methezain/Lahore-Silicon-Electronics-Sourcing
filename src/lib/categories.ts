export const CATEGORIES = ["Power", "Boards", "ICs", "Sensors", "Relays"] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Plain tile headings for the parts actually on the counter.
 * "Timers and logic" is not used: the only IC is a timer.
 */
export const CATEGORY_HEADINGS: Record<Category, string> = {
  Power: "Regulators",
  Boards: "Microcontrollers and radios",
  Sensors: "Distance, heat, light",
  ICs: "Timers",
  Relays: "Switching",
};

/**
 * Large bento tile. Counts do not choose this.
 * Editorial until the owner names a lead job (docs/decisions.md).
 */
export const FEATURED_CATEGORY: Category = "Boards";

/** Photograph on that tile. A real part in FEATURED_CATEGORY. */
export const FEATURED_TILE_PART = "ESP32-WROOM-32D";
