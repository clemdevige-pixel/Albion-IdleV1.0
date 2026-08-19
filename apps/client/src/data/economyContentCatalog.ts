import { getEnchantmentShardItemId } from "@game/gameplay";
import type { WorldBandId } from "@game/data";
import {
  getDungeonKeyFragmentItemId,
  getDungeonKeyItemId,
} from "./dungeonKeyContentCatalog.js";

/**
 * Generic depth curve retained for other non-enchantment loot families.
 * Dungeon keys use their own band progression profile below.
 */
export const SEGMENT_LOOT_MULTIPLIERS = [
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

export const BASE_COMBAT_DROP_RATES = {
  keyFragment: 0.02,
  completeKey: 0.001,
} as const;

/**
 * Dungeon key progression is independent for every world band because each
 * band drops a different key tier. The same authored shape is reused as the
 * starting balance profile: low at band entry, progressively stronger through
 * the walls, and highest at the end of the band.
 */
export interface DungeonKeyZoneProgressionWeight {
  readonly start: number;
  readonly end: number;
}

export const DEFAULT_DUNGEON_KEY_BAND_PROGRESSION: readonly DungeonKeyZoneProgressionWeight[] = [
  { start: 0.45, end: 0.6 },
  { start: 0.65, end: 0.9 },
  { start: 0.95, end: 1.4 },
  { start: 1.5, end: 2.4 },
  { start: 2.6, end: 4.0 },
] as const;

export const DUNGEON_KEY_PROGRESSION_WEIGHTS: Readonly<
  Record<WorldBandId, readonly DungeonKeyZoneProgressionWeight[]>
> = {
  blue: DEFAULT_DUNGEON_KEY_BAND_PROGRESSION,
  yellow: DEFAULT_DUNGEON_KEY_BAND_PROGRESSION,
  orange: DEFAULT_DUNGEON_KEY_BAND_PROGRESSION,
  red: DEFAULT_DUNGEON_KEY_BAND_PROGRESSION,
  black: DEFAULT_DUNGEON_KEY_BAND_PROGRESSION,
} as const;

export function getDungeonKeyProgressionWeight(
  bandId: WorldBandId,
  zoneIndexWithinBand: number,
  segmentIndex: number,
): number {
  const zone = DUNGEON_KEY_PROGRESSION_WEIGHTS[bandId][zoneIndexWithinBand];
  if (zone === undefined) return 0;
  const clampedSegment = Math.max(0, Math.min(9, Math.floor(segmentIndex)));
  const progress = clampedSegment / 9;
  return zone.start + (zone.end - zone.start) * progress;
}

/**
 * Enchantment shard calibration.
 *
 * Shard progression is authored independently from enemy HP. Each zone owns a
 * start/end progression weight which interpolates across its ten segments so
 * shard income follows actual enchantment walls while preserving an incentive
 * to farm deeper accessible segments.
 */
export const ENCHANTMENT_SHARD_BASE_EXPECTED_PER_KILL = 0.0165;
export const ENCHANTMENT_SHARD_DEPTH_BONUS_PER_SEGMENT = 0.015;
export const ENCHANTMENT_SHARD_ELITE_MULTIPLIER = 1.2;
export const ENCHANTMENT_SHARD_BOSS_MULTIPLIER = 1.35;

export interface EnchantmentShardZoneProgressionWeight {
  readonly start: number;
  readonly end: number;
}

/**
 * Reference five-zone shard profile used during economy calibration.
 * Live world bands below are authored explicitly rather than applying a hidden
 * runtime tier multiplier, so future balance work can read the actual rates
 * directly from this catalog.
 */
export const DEFAULT_ENCHANTMENT_SHARD_BAND_PROGRESSION:
readonly EnchantmentShardZoneProgressionWeight[] = [
  { start: 3.5, end: 5.5 },
  { start: 4.8, end: 6.2 },
  { start: 5.8, end: 7.4 },
  { start: 7.6, end: 10.2 },
  { start: 9.0, end: 10.5 },
] as const;

export const ENCHANTMENT_SHARD_PROGRESSION_WEIGHTS: Readonly<
  Record<WorldBandId, readonly EnchantmentShardZoneProgressionWeight[]>
> = {
  // Blue/T4 keeps the validated entry pacing unchanged.
  blue: [
    { start: 0.35, end: 0.5 },
    { start: 0.5, end: 0.9 },
    { start: 0.9, end: 2.0 },
    { start: 3.8, end: 6.5 },
    { start: 6.8, end: 9.5 },
  ],
  // T5 keeps the reference profile unchanged.
  yellow: [
    { start: 3.5, end: 5.5 },
    { start: 4.8, end: 6.2 },
    { start: 5.8, end: 7.4 },
    { start: 7.6, end: 10.2 },
    { start: 9.0, end: 10.5 },
  ],
  // T6 keeps the reference profile unchanged; the final craft mix already
  // creates the intended combat/gather split at this tier.
  orange: [
    { start: 3.5, end: 5.5 },
    { start: 4.8, end: 6.2 },
    { start: 5.8, end: 7.4 },
    { start: 7.6, end: 10.2 },
    { start: 9.0, end: 10.5 },
  ],
  // T7 uses ~x1.10 to reach the validated ~25% average gathering share.
  red: [
    { start: 3.85, end: 6.05 },
    { start: 5.28, end: 6.82 },
    { start: 6.38, end: 8.14 },
    { start: 8.36, end: 11.22 },
    { start: 9.9, end: 11.55 },
  ],
  // T8 uses ~x1.10 for the same high-tier combat/gather balance target.
  black: [
    { start: 3.85, end: 6.05 },
    { start: 5.28, end: 6.82 },
    { start: 6.38, end: 8.14 },
    { start: 8.36, end: 11.22 },
    { start: 9.9, end: 11.55 },
  ],
} as const;

export function getEnchantmentShardProgressionWeight(
  bandId: WorldBandId,
  zoneIndexWithinBand: number,
  segmentIndex: number,
): number {
  const zone = ENCHANTMENT_SHARD_PROGRESSION_WEIGHTS[bandId][zoneIndexWithinBand];
  if (zone === undefined) return 0;
  const clampedSegment = Math.max(0, Math.min(9, Math.floor(segmentIndex)));
  const progress = clampedSegment / 9;
  return zone.start + (zone.end - zone.start) * progress;
}

export const KEY_FRAGMENTS_PER_KEY = 50;
export const ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE = 200;
export const BOSS_SPECIAL_DROP_MULTIPLIER = 2;

export type CombatDropKind =
  | "consumable"
  | "enchantment"
  | "key_fragment"
  | "key"
  | "artifact_fragment"
  | "artifact";

export interface CombatDrop {
  readonly itemId: string;
  readonly kind: CombatDropKind;
  readonly quantity: number;
}

export interface CombatLootContext {
  /** Zero-based segment index (0..9). */
  readonly segmentIndex: number;
  readonly faction: string;
  readonly isElite: boolean;
  readonly isBoss: boolean;
  readonly isFinalBoss: boolean;
  /** Equipment tier represented by the current world band: blue=T4, yellow=T5, etc. */
  readonly enchantmentTier: number;
  /** Authored relative shard-progression weight for the active zone/segment. */
  readonly enchantmentDropWeight: number;
  /** Authored relative dungeon-key progression weight for the active zone/segment. */
  readonly dungeonKeyDropWeight: number;
}

export interface CombatLootExpectation {
  readonly itemId: string;
  readonly kind: CombatDropKind;
  /** Expected quantity per kill. Values below 1 are equivalent to drop chance. */
  readonly expectedQuantity: number;
}

type CombatLootItemSource =
  | { readonly type: "fixed"; readonly itemId: string }
  | { readonly type: "enchantment_shard" }
  | { readonly type: "dungeon_key_fragment" }
  | { readonly type: "dungeon_key" };

type CombatLootRateModel =
  | { readonly type: "segment_scaled"; readonly baseRate: number; readonly bossMultiplier: boolean }
  | { readonly type: "dungeon_key"; readonly baseRate: number; readonly bossMultiplier: boolean }
  | { readonly type: "enchantment" };

export interface CombatLootRuleDefinition {
  readonly kind: CombatDropKind;
  readonly item: CombatLootItemSource;
  readonly rate: CombatLootRateModel;
}

/**
 * Authoritative world-combat loot definitions.
 *
 * Artifact fragments and complete artifacts are intentionally absent here:
 * they are dungeon-only rewards and are authored in dungeonLootContentCatalog.
 * Health potions remain vendor-only.
 */
export const COMBAT_LOOT_RULES: readonly CombatLootRuleDefinition[] = [
  {
    kind: "enchantment",
    item: { type: "enchantment_shard" },
    rate: { type: "enchantment" },
  },
  {
    kind: "key_fragment",
    item: { type: "dungeon_key_fragment" },
    rate: { type: "dungeon_key", baseRate: BASE_COMBAT_DROP_RATES.keyFragment, bossMultiplier: true },
  },
  {
    kind: "key",
    item: { type: "dungeon_key" },
    rate: { type: "dungeon_key", baseRate: BASE_COMBAT_DROP_RATES.completeKey, bossMultiplier: true },
  },
] as const;

/** Supports expected values above 1 without probability-cap distortion. */
function rollExpectedQuantity(expected: number, random: () => number): number {
  const safeExpected = Math.max(0, expected);
  const guaranteed = Math.floor(safeExpected);
  const fractional = safeExpected - guaranteed;
  return guaranteed + (fractional > 0 && random() < fractional ? 1 : 0);
}

export function getSegmentLootMultiplier(segmentIndex: number): number {
  const clampedIndex = Math.min(
    SEGMENT_LOOT_MULTIPLIERS.length - 1,
    Math.max(0, Math.floor(segmentIndex)),
  );
  return SEGMENT_LOOT_MULTIPLIERS[clampedIndex] ?? 1;
}

export function getEnchantmentShardExpectedDrop(
  context: Pick<
    CombatLootContext,
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
  context: CombatLootContext,
): string {
  if (source.type === "fixed") return source.itemId;
  if (source.type === "enchantment_shard") {
    return getEnchantmentShardItemId(context.enchantmentTier);
  }
  if (source.type === "dungeon_key_fragment") {
    return getDungeonKeyFragmentItemId(context.enchantmentTier);
  }
  return getDungeonKeyItemId(context.enchantmentTier);
}

function resolveCombatLootExpectedQuantity(
  rate: CombatLootRateModel,
  context: CombatLootContext,
): number {
  if (rate.type === "enchantment") return getEnchantmentShardExpectedDrop(context);

  if (rate.type === "dungeon_key") {
    const bossMultiplier = rate.bossMultiplier && context.isBoss
      ? BOSS_SPECIAL_DROP_MULTIPLIER
      : 1;
    return rate.baseRate * Math.max(0, context.dungeonKeyDropWeight) * bossMultiplier;
  }

  const bossMultiplier = rate.bossMultiplier && context.isBoss
    ? BOSS_SPECIAL_DROP_MULTIPLIER
    : 1;
  return rate.baseRate * getSegmentLootMultiplier(context.segmentIndex) * bossMultiplier;
}

/**
 * Deterministic projection consumed by both runtime rolls and Bestiary display.
 * This is the single source of truth for which active world-combat drops exist
 * and their context-dependent probabilities/yields.
 */
export function getCombatLootExpectations(
  context: CombatLootContext,
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

export function rollCombatDrops(
  context: CombatLootContext,
  random: () => number = Math.random,
): readonly CombatDrop[] {
  const drops: CombatDrop[] = [];
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

/** @deprecated Compatibility helper for legacy call sites. */
export function rollEnchantmentMaterial(): string | undefined {
  return Math.random() < ENCHANTMENT_SHARD_BASE_EXPECTED_PER_KILL
    ? getEnchantmentShardItemId(4)
    : undefined;
}

export interface RepairCostDefinitionData {
  readonly equipmentCategory: "weapon" | "armor" | "accessory";
  readonly itemTier: number;
  readonly baseRepairCost: number;
  readonly costMultiplier: number;
  readonly enabled: boolean;
}

/**
 * Repair pricing remains explicitly authored economy data. Do not extrapolate
 * T5+ values from T3/T4 without a balance decision. The runtime itself accepts
 * arbitrary tiers; this table intentionally contains only approved prices.
 */
export const REPAIR_COST_DEFINITIONS: readonly RepairCostDefinitionData[] = [
  { equipmentCategory: "weapon", itemTier: 3, baseRepairCost: 40, costMultiplier: 1.0, enabled: true },
  { equipmentCategory: "armor", itemTier: 3, baseRepairCost: 30, costMultiplier: 1.0, enabled: true },
  { equipmentCategory: "accessory", itemTier: 3, baseRepairCost: 25, costMultiplier: 1.0, enabled: true },
  { equipmentCategory: "weapon", itemTier: 4, baseRepairCost: 70, costMultiplier: 1.0, enabled: true },
  { equipmentCategory: "armor", itemTier: 4, baseRepairCost: 55, costMultiplier: 1.0, enabled: true },
  { equipmentCategory: "accessory", itemTier: 4, baseRepairCost: 45, costMultiplier: 1.0, enabled: true },
];

export function getAuthoredRepairCostTiers(): readonly number[] {
  return [...new Set(REPAIR_COST_DEFINITIONS.map(({ itemTier }) => itemTier))].sort((a, b) => a - b);
}

export function getMissingRepairCostDefinitions(
  tiers: readonly number[],
  categories: readonly RepairCostDefinitionData["equipmentCategory"][] = ["weapon", "armor", "accessory"],
): readonly { readonly itemTier: number; readonly equipmentCategory: RepairCostDefinitionData["equipmentCategory"] }[] {
  return tiers.flatMap((itemTier) => categories
    .filter((equipmentCategory) => !REPAIR_COST_DEFINITIONS.some((definition) =>
      definition.itemTier === itemTier && definition.equipmentCategory === equipmentCategory,
    ))
    .map((equipmentCategory) => ({ itemTier, equipmentCategory })));
}

export const GENERAL_VENDOR_FIXED_OFFERS = [
  { itemId: "item_health_potion", buyPrice: 50, sellPrice: 20, maxPerTransaction: null, enabled: true },
  { itemId: "item_leather_armor", buyPrice: null, sellPrice: 60, maxPerTransaction: null, enabled: true },
  { itemId: "item_wooden_shield", buyPrice: null, sellPrice: 48, maxPerTransaction: null, enabled: true },
  { itemId: "item_shield_t3_reinforced", buyPrice: null, sellPrice: 90, maxPerTransaction: null, enabled: true },
  { itemId: "item_iron_helmet", buyPrice: null, sellPrice: 70, maxPerTransaction: null, enabled: true },
  { itemId: "item_leather_boots", buyPrice: null, sellPrice: 55, maxPerTransaction: null, enabled: true },
  { itemId: "item_traveler_cape", buyPrice: null, sellPrice: 65, maxPerTransaction: null, enabled: true },
];