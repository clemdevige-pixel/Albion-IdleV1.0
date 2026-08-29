import {
  DUNGEON_ARTIFACT_FACTIONS,
  getDungeonArtifactFragmentItemId,
  getDungeonArtifactItemId,
  type DungeonArtifactFactionId,
} from "./dungeon-artifacts.js";
import { getDungeonKeyFragmentItemId, getDungeonKeyItemId } from "./dungeon-keys.js";
import {
  GATHERING_RESOURCE_FAMILY_IDS,
  GATHERING_RESOURCE_TIER_CONTENT,
  type GatheringResourceFamilyId,
} from "./gathering-content.js";
import { AUTHORED_REFINING_RECIPES } from "./refining-content.js";

export const GENERAL_VENDOR_ID = "vendor_general" as const;
export const DAILY_MERCHANT_VENDOR_ID = "vendor_daily" as const;

export const DAILY_MERCHANT_TIERS = [4, 5, 6, 7, 8] as const;
export type DailyMerchantTier = (typeof DAILY_MERCHANT_TIERS)[number];

export const DAILY_MERCHANT_CATEGORIES = [
  "raw_resource",
  "refined_resource",
  "enchantment_shard",
  "key_fragment",
  "key",
  "artifact_fragment",
  "artifact",
] as const;
export type DailyMerchantCategory = (typeof DAILY_MERCHANT_CATEGORIES)[number];

export const DAILY_MERCHANT_ROTATION_RULES = {
  offerCount: 5,
  tierSelection: "uniform_unlocked",
  guaranteedCategoryGroups: [
    ["raw_resource", "refined_resource"],
  ],
  limitedCategoryGroups: [
    {
      categories: ["key", "artifact"],
      maximumPerRotation: 1,
    },
  ],
} as const satisfies {
  readonly offerCount: number;
  readonly tierSelection: "uniform_unlocked";
  readonly guaranteedCategoryGroups: readonly (readonly DailyMerchantCategory[])[];
  readonly limitedCategoryGroups: readonly {
    readonly categories: readonly DailyMerchantCategory[];
    readonly maximumPerRotation: number;
  }[];
};

export const DAILY_MERCHANT_CATEGORY_WEIGHTS: Readonly<Record<DailyMerchantCategory, number>> = {
  raw_resource: 25,
  refined_resource: 25,
  enchantment_shard: 20,
  key_fragment: 12,
  artifact_fragment: 10,
  key: 6,
  artifact: 2,
} as const;

export const DAILY_MERCHANT_QUANTITIES = {
  raw_resource: [10, 20],
  refined_resource: [5, 10],
  enchantment_shard: [5, 10, 15],
  key_fragment: [5, 10],
  key: [1],
  artifact_fragment: [5, 10, 15],
  artifact: [1],
} as const satisfies Readonly<Record<DailyMerchantCategory, readonly number[]>>;

export const DAILY_MERCHANT_UNIT_PRICES = {
  raw_resource: { 4: 400, 5: 1_000, 6: 2_250, 7: 3_000, 8: 3_750 },
  refined_resource: { 4: 2_000, 5: 5_500, 6: 14_000, 7: 22_000, 8: 30_500 },
  enchantment_shard: { 4: 1_000, 5: 1_500, 6: 2_000, 7: 2_500, 8: 3_500 },
  key_fragment: { 4: 650, 5: 1_350, 6: 2_750, 7: 3_700, 8: 7_300 },
  key: { 4: 32_500, 5: 67_500, 6: 137_500, 7: 185_000, 8: 365_000 },
  artifact_fragment: { 4: 550, 5: 900, 6: 1_575, 7: 1_950, 8: 3_400 },
  artifact: { 4: 110_000, 5: 182_500, 6: 315_000, 7: 390_000, 8: 680_000 },
} as const satisfies Readonly<
  Record<DailyMerchantCategory, Readonly<Record<DailyMerchantTier, number>>>
>;

export const DAILY_MERCHANT_SHARD_ITEM_IDS: Readonly<Record<DailyMerchantTier, string>> = {
  4: "item_resource_enchantment_shard_t4",
  5: "item_resource_enchantment_shard_t5",
  6: "item_resource_enchantment_shard_t6",
  7: "item_resource_enchantment_shard_t7",
  8: "item_resource_enchantment_shard_t8",
} as const;

export interface DailyMerchantCandidate {
  readonly category: DailyMerchantCategory;
  readonly tier: DailyMerchantTier;
  readonly itemId: string;
  readonly unitPrice: number;
  readonly resourceFamily?: GatheringResourceFamilyId;
  readonly artifactFaction?: DungeonArtifactFactionId;
}

export function getDailyMerchantCandidatesForTier(
  tier: DailyMerchantTier,
): readonly DailyMerchantCandidate[] {
  const raw = GATHERING_RESOURCE_FAMILY_IDS.map((resourceFamily) => ({
    category: "raw_resource" as const,
    tier,
    itemId: GATHERING_RESOURCE_TIER_CONTENT[resourceFamily][tier].rawItemId,
    unitPrice: DAILY_MERCHANT_UNIT_PRICES.raw_resource[tier],
    resourceFamily,
  }));
  const refined = GATHERING_RESOURCE_FAMILY_IDS.map((resourceFamily) => ({
    category: "refined_resource" as const,
    tier,
    itemId: AUTHORED_REFINING_RECIPES[resourceFamily][tier].outputItemId,
    unitPrice: DAILY_MERCHANT_UNIT_PRICES.refined_resource[tier],
    resourceFamily,
  }));
  const artifactFragments = DUNGEON_ARTIFACT_FACTIONS.map((artifactFaction) => ({
    category: "artifact_fragment" as const,
    tier,
    itemId: getDungeonArtifactFragmentItemId(artifactFaction, tier),
    unitPrice: DAILY_MERCHANT_UNIT_PRICES.artifact_fragment[tier],
    artifactFaction,
  }));
  const artifacts = DUNGEON_ARTIFACT_FACTIONS.map((artifactFaction) => ({
    category: "artifact" as const,
    tier,
    itemId: getDungeonArtifactItemId(artifactFaction, tier),
    unitPrice: DAILY_MERCHANT_UNIT_PRICES.artifact[tier],
    artifactFaction,
  }));

  return [
    ...raw,
    ...refined,
    {
      category: "enchantment_shard",
      tier,
      itemId: DAILY_MERCHANT_SHARD_ITEM_IDS[tier],
      unitPrice: DAILY_MERCHANT_UNIT_PRICES.enchantment_shard[tier],
    },
    {
      category: "key_fragment",
      tier,
      itemId: getDungeonKeyFragmentItemId(tier),
      unitPrice: DAILY_MERCHANT_UNIT_PRICES.key_fragment[tier],
    },
    {
      category: "key",
      tier,
      itemId: getDungeonKeyItemId(tier),
      unitPrice: DAILY_MERCHANT_UNIT_PRICES.key[tier],
    },
    ...artifactFragments,
    ...artifacts,
  ];
}

export const DAILY_MERCHANT_ALL_CANDIDATES: readonly DailyMerchantCandidate[] =
  DAILY_MERCHANT_TIERS.flatMap((tier) => getDailyMerchantCandidatesForTier(tier));

export const DAILY_MERCHANT_CANDIDATE_ITEM_IDS: ReadonlySet<string> = new Set(
  DAILY_MERCHANT_ALL_CANDIDATES.map((candidate) => candidate.itemId),
);

export const DAILY_MERCHANT_VENDOR_OFFERS = DAILY_MERCHANT_ALL_CANDIDATES.map((candidate) => ({
  itemId: candidate.itemId,
  buyPrice: candidate.unitPrice,
  sellPrice: null,
  maxPerTransaction: Math.max(...DAILY_MERCHANT_QUANTITIES[candidate.category]),
  enabled: true,
})) as readonly {
  readonly itemId: string;
  readonly buyPrice: number;
  readonly sellPrice: null;
  readonly maxPerTransaction: number;
  readonly enabled: true;
}[];
