export const CATEGORIES = ["Power", "Boards", "ICs", "Sensors", "Relays"] as const;

export type Category = (typeof CATEGORIES)[number];
