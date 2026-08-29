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

/** Intrinsic economic value used by equipment valuation; intentionally excludes merchant rarity markup. */
export const BLACK_MARKET_ARTIFACT_ECONOMIC_VALUE_BY_TIER = {
  4: 35_000,
  5: 60_000,
  6: 100_000,
  7: 150_000,
  8: 220_000,
} as const;

/** Economic value per consumed faction Rune. Quantity scaling remains authored by ARTIFACT_WEAPON_RUNE_COST_BY_TIER. */
export const BLACK_MARKET_RUNE_ECONOMIC_VALUE_BY_TIER = {
  4: 1_000,
  5: 1_250,
  6: 1_500,
  7: 1_750,
  8: 2_000,
} as const;
