import { getEnchantmentShardItemId } from "@game/gameplay";

/**
 * Combat loot uses independent rolls. A key fragment, an enchantment shard and
 * other eligible rewards can therefore drop from the same kill. The definitions
 * below are also consumed by the Bestiary so gameplay and UI share one source
 * of truth.
 */
export const BLUE_ZONE_SEGMENT_LOOT_MULTIPLIERS = [
  1,
  1.05,
  1.1,
  1.15,
  1.2,
  1.25,
  1.3,
  1.35,
  1.4,
  1.5,
] as const;

export const BLUE_ZONE_BASE_DROP_RATES = {
  keyFragment: 0.02,
  completeKey: 0.001,
} as const;

/**
 * Enchantment shard calibration.
 *
 * The baseline is calibrated against the synthetic T4.2 / M20 combat profile,
 * using the same weapon envelope and Blue TTK model as progression balance.
 * Deep T4 farming lands around the validated 25-30 shards/hour target while
 * the depth/HP weighting prevents trivial early segments from becoming the
 * permanent optimal farm.
 *
 * Elite and boss multipliers are mutually exclusive: a segment boss may carry
 * both tags in content data, but it must never receive both multipliers.
 */
export const ENCHANTMENT_SHARD_BASE_EXPECTED_PER_KILL = 0.011;
export const ENCHANTMENT_SHARD_DEPTH_BONUS_PER_SEGMENT = 0.015;
export const ENCHANTMENT_SHARD_ELITE_MULTIPLIER = 1.2;
export const ENCHANTMENT_SHARD_BOSS_MULTIPLIER = 1.35;

export const BLUE_ZONE_BOSS_DROP_RATES = {
  segmentBossArtifactFragment: 0.2,
  segmentBossArtifact: 0.005,
  finalBossArtifactFragment: 0.4,
  finalBossArtifact: 0.015,
} as const;

export const KEY_FRAGMENTS_PER_KEY = 50;
export const ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE = 200;
export const BOSS_SPECIAL_DROP_MULTIPLIER = 2;

export type BlueZoneCombatDropKind =
  | "consumable"
  | "enchantment"
  | "key_fragment"
  | "key"
  | "artifact_fragment"
  | "artifact";

export interface BlueZoneCombatDrop {
  readonly itemId: string;
  readonly kind: BlueZoneCombatDropKind;
  readonly quantity: number;
}

export interface BlueZoneLootContext {
  /** Zero-based segment index (0..9). */
  readonly segmentIndex: number;
  readonly faction: string;
  readonly isElite: boolean;
  readonly isBoss: boolean;
  readonly isFinalBoss: boolean;
  /** Equipment tier represented by the current world band: blue=T4, yellow=T5, etc. */
  readonly enchantmentTier: number;
  /** Relative monster combat weight. 1 = first regular enemy of the current band. */
  readonly enchantmentDropWeight: number;
}

export interface CombatLootExpectation {
  readonly itemId: string;
  readonly kind: BlueZoneCombatDropKind;
  /** Expected quantity per kill. Values below 1 are equivalent to drop chance. */
  readonly expectedQuantity: number;
}

type CombatLootItemSource =
  | { readonly type: "fixed"; readonly itemId: string }
  | { readonly type: "enchantment_shard" }
  | {
      readonly type: "faction";
      readonly prefix: string;
    };

type CombatLootRateModel =
  | { readonly type: "segment_scaled"; readonly baseRate: number; readonly bossMultiplier: boolean }
  | { readonly type: "enchantment" }
  | { readonly type: "artifact_fragment" }
  | { readonly type: "artifact" };

export interface CombatLootRuleDefinition {
  readonly kind: BlueZoneCombatDropKind;
  readonly item: CombatLootItemSource;
  readonly rate: CombatLootRateModel;
}

/**
 * Authoritative active combat-loot definitions.
 *
 * Adding a simple droppable item should normally be a data addition here, not
 * a new Bestiary/UI special case. Dynamic faction/tier identities are resolved
 * generically by the item source.
 *
 * Health potions are intentionally vendor-only and are therefore absent from
 * active combat loot.
 */
export const COMBAT_LOOT_RULES: readonly CombatLootRuleDefinition[] = [
  {
    kind: "enchantment",
    item: { type: "enchantment_shard" },
    rate: { type: "enchantment" },
  },
  {
    kind: "key_fragment",
    item: { type: "faction", prefix: "item_resource_key_fragment_" },
    rate: { type: "segment_scaled", baseRate: BLUE_ZONE_BASE_DROP_RATES.keyFragment, bossMultiplier: true },
  },
  {
    kind: "key",
    item: { type: "faction", prefix: "item_resource_dungeon_key_" },
    rate: { type: "segment_scaled", baseRate: BLUE_ZONE_BASE_DROP_RATES.completeKey, bossMultiplier: true },
  },
  {
    kind: "artifact_fragment",
    item: { type: "faction", prefix: "item_resource_artifact_fragment_" },
    rate: { type: "artifact_fragment" },
  },
  {
    kind: "artifact",
    item: { type: "faction", prefix: "item_resource_artifact_" },
    rate: { type: "artifact" },
  },
] as const;

function normalizeFactionId(faction: string): string {
  return faction.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

/** Supports expected values above 1 without probability-cap distortion. */
function rollExpectedQuantity(expected: number, random: () => number): number {
  const safeExpected = Math.max(0, expected);
  const guaranteed = Math.floor(safeExpected);
  const fractional = safeExpected - guaranteed;
  return guaranteed + (fractional > 0 && random() < fractional ? 1 : 0);
}

export function getBlueZoneSegmentLootMultiplier(segmentIndex: number): number {
  const clampedIndex = Math.min(
    BLUE_ZONE_SEGMENT_LOOT_MULTIPLIERS.length - 1,
    Math.max(0, Math.floor(segmentIndex)),
  );
  return BLUE_ZONE_SEGMENT_LOOT_MULTIPLIERS[clampedIndex] ?? 1;
}

export function getEnchantmentShardExpectedDrop(
  context: Pick<
    BlueZoneLootContext,
    "segmentIndex" | "isElite" | "isBoss" | "enchantmentDropWeight"
  >,
): number {
  const depthBonus =
    1 + Math.max(0, context.segmentIndex) * ENCHANTMENT_SHARD_DEPTH_BONUS_PER_SEGMENT;
  const categoryMultiplier = context.isBoss
    ? ENCHANTMENT_SHARD_BOSS_MULTIPLIER
    : context.isElite
      ? ENCHANTMENT_SHARD_ELITE_MULTIPLIER
      : 1;
  return ENCHANTMENT_SHARD_BASE_EXPECTED_PER_KILL
    * Math.max(0, context.enchantmentDropWeight)
    * depthBonus
    * categoryMultiplier;
}

function resolveCombatLootItemId(
  source: CombatLootItemSource,
  context: BlueZoneLootContext,
): string {
  if (source.type === "fixed") return source.itemId;
  if (source.type === "enchantment_shard") {
    return getEnchantmentShardItemId(context.enchantmentTier);
  }
  return `${source.prefix}${normalizeFactionId(context.faction)}`;
}

function resolveCombatLootExpectedQuantity(
  rate: CombatLootRateModel,
  context: BlueZoneLootContext,
): number {
  if (rate.type === "enchantment") return getEnchantmentShardExpectedDrop(context);

  if (rate.type === "segment_scaled") {
    const bossMultiplier = rate.bossMultiplier && context.isBoss
      ? BOSS_SPECIAL_DROP_MULTIPLIER
      : 1;
    return rate.baseRate * getBlueZoneSegmentLootMultiplier(context.segmentIndex) * bossMultiplier;
  }

  if (!context.isBoss) return 0;
  if (rate.type === "artifact_fragment") {
    return context.isFinalBoss
      ? BLUE_ZONE_BOSS_DROP_RATES.finalBossArtifactFragment
      : BLUE_ZONE_BOSS_DROP_RATES.segmentBossArtifactFragment;
  }
  return context.isFinalBoss
    ? BLUE_ZONE_BOSS_DROP_RATES.finalBossArtifact
    : BLUE_ZONE_BOSS_DROP_RATES.segmentBossArtifact;
}

/**
 * Deterministic projection consumed by both runtime rolls and Bestiary display.
 * This is the single source of truth for which active combat drops exist and
 * their context-dependent probabilities/yields.
 */
export function getCombatLootExpectations(
  context: BlueZoneLootContext,
): readonly CombatLootExpectation[] {
  return COMBAT_LOOT_RULES.flatMap((rule) => {
    const expectedQuantity = resolveCombatLootExpectedQuantity(rule.rate, context);
    if (expectedQuantity <= 0) return [];
    return [{
      itemId: resolveCombatLootItemId(rule.item, context),
      kind: rule.kind,
      expectedQuantity,
    }];
  });
}

export function rollBlueZoneCombatDrops(
  context: BlueZoneLootContext,
  random: () => number = Math.random,
): readonly BlueZoneCombatDrop[] {
  const drops: BlueZoneCombatDrop[] = [];
  for (const expectation of getCombatLootExpectations(context)) {
    const quantity = rollExpectedQuantity(expectation.expectedQuantity, random);
    if (quantity <= 0) continue;
    drops.push({
      itemId: expectation.itemId,
      kind: expectation.kind,
      quantity,
    });
  }
  return drops;
}

export const HEALTH_POTION_HEAL_RATIO = 0.3;
export const HEALTH_POTION_COOLDOWN_SECONDS = 20;

export const ENCHANTMENT_MATERIAL_NAMES: Readonly<Record<string, string>> = {
  item_resource_enchantment_shard_t4: "Éclat d’enchantement T4",
  item_resource_enchantment_shard_t5: "Éclat d’enchantement T5",
  item_resource_enchantment_shard_t6: "Éclat d’enchantement T6",
  item_resource_enchantment_shard_t7: "Éclat d’enchantement T7",
  item_resource_enchantment_shard_t8: "Éclat d’enchantement T8",
};

/** @deprecated Use rollBlueZoneCombatDrops with a tiered loot context. */
export function rollEnchantmentMaterial(): string | undefined {
  return Math.random() < ENCHANTMENT_SHARD_BASE_EXPECTED_PER_KILL
    ? getEnchantmentShardItemId(4)
    : undefined;
}

export const REPAIR_COST_DEFINITIONS = [
  { equipmentCategory: "weapon", itemTier: 3, baseRepairCost: 40, costMultiplier: 1.0, enabled: true },
  { equipmentCategory: "armor", itemTier: 3, baseRepairCost: 30, costMultiplier: 1.0, enabled: true },
  { equipmentCategory: "accessory", itemTier: 3, baseRepairCost: 25, costMultiplier: 1.0, enabled: true },
  { equipmentCategory: "weapon", itemTier: 4, baseRepairCost: 70, costMultiplier: 1.0, enabled: true },
  { equipmentCategory: "armor", itemTier: 4, baseRepairCost: 55, costMultiplier: 1.0, enabled: true },
  { equipmentCategory: "accessory", itemTier: 4, baseRepairCost: 45, costMultiplier: 1.0, enabled: true },
];

export const GENERAL_VENDOR_FIXED_OFFERS = [
  { itemId: "item_health_potion", buyPrice: 50, sellPrice: 20, maxPerTransaction: null, enabled: true },
  { itemId: "item_leather_armor", buyPrice: null, sellPrice: 60, maxPerTransaction: null, enabled: true },
  { itemId: "item_wooden_shield", buyPrice: null, sellPrice: 48, maxPerTransaction: null, enabled: true },
  { itemId: "item_shield_t3_reinforced", buyPrice: null, sellPrice: 90, maxPerTransaction: null, enabled: true },
  { itemId: "item_iron_helmet", buyPrice: null, sellPrice: 70, maxPerTransaction: null, enabled: true },
  { itemId: "item_leather_boots", buyPrice: null, sellPrice: 55, maxPerTransaction: null, enabled: true },
  { itemId: "item_traveler_cape", buyPrice: null, sellPrice: 65, maxPerTransaction: null, enabled: true },
];
