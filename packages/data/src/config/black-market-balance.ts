export const BLACK_MARKET_BASE_RATE = 0.55;
export const BLACK_MARKET_CARGO_SLOT_LIMIT = 8;
export const BLACK_MARKET_STACK_LIMIT = 5;
export const BLACK_MARKET_DEMAND_COUNT = 3;

export const BLACK_MARKET_ROUTES = [
  { id: "watched", displayName: "Route surveillée", successChance: 0.9, payoutMultiplier: 1.2, durationMs: 15 * 60 * 1_000 },
  { id: "contested", displayName: "Route contestée", successChance: 0.7, payoutMultiplier: 1.75, durationMs: 30 * 60 * 1_000 },
  { id: "forbidden", displayName: "Route interdite", successChance: 0.45, payoutMultiplier: 3, durationMs: 60 * 60 * 1_000 },
] as const;

export type BlackMarketRouteId = (typeof BLACK_MARKET_ROUTES)[number]["id"];

export const BLACK_MARKET_DEMAND_QUANTITY_BY_TIER = {
  4: { min: 5, max: 8 },
  5: { min: 4, max: 7 },
  6: { min: 3, max: 6 },
  7: { min: 2, max: 5 },
  8: { min: 1, max: 4 },
} as const;

export const BLACK_MARKET_DEMAND_BONUSES = [
  { id: "demand", bonus: 0.4, weight: 60 },
  { id: "strong_demand", bonus: 0.7, weight: 30 },
  { id: "shortage", bonus: 1, weight: 10 },
] as const;

export const BLACK_MARKET_WEAPON_FAMILY_TARGETS = [
  "sword",
  "bow",
  "fire_staff",
  "gloves",
  "dagger",
] as const;

export const BLACK_MARKET_ARMOR_SLOT_TARGETS = ["head", "torso", "boots"] as const;
