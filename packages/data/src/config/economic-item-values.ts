export const ECONOMIC_VALUE_TIERS = [4, 5, 6, 7, 8] as const;
export type EconomicValueTier = (typeof ECONOMIC_VALUE_TIERS)[number];

/** Canonical economic unit values shared by systems that value production inputs. */
export const PRODUCTION_INPUT_ECONOMIC_VALUE_BY_TIER = {
  raw_resource: { 4: 400, 5: 1_000, 6: 2_250, 7: 3_000, 8: 3_750 },
  refined_resource: { 4: 2_000, 5: 5_500, 6: 14_000, 7: 22_000, 8: 30_500 },
  enchantment_shard: { 4: 1_000, 5: 1_500, 6: 2_000, 7: 2_500, 8: 3_500 },
} as const satisfies Readonly<
  Record<string, Readonly<Record<EconomicValueTier, number>>>
>;

/** Intrinsic artifact value. Merchant availability markup is intentionally excluded. */
export const ARTIFACT_ECONOMIC_VALUE_BY_TIER = {
  4: 35_000,
  5: 60_000,
  6: 100_000,
  7: 150_000,
  8: 220_000,
} as const satisfies Readonly<Record<EconomicValueTier, number>>;

/** Intrinsic value per consumed faction Rune; recipe quantity supplies most of its tier scaling. */
export const FACTION_RUNE_ECONOMIC_VALUE_BY_TIER = {
  4: 1_000,
  5: 1_250,
  6: 1_500,
  7: 1_750,
  8: 2_000,
} as const satisfies Readonly<Record<EconomicValueTier, number>>;
