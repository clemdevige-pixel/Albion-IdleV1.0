import { getEnchantmentShardItemId } from "@game/gameplay";
import {
  BOSS_SPECIAL_DROP_MULTIPLIER,
  COMBAT_LOOT_RULES,
  DUNGEON_KEY_PROGRESSION_WEIGHTS,
  ENCHANTMENT_SHARD_BASE_EXPECTED_PER_KILL,
  ENCHANTMENT_SHARD_BOSS_MULTIPLIER,
  ENCHANTMENT_SHARD_DEPTH_BONUS_PER_SEGMENT,
  ENCHANTMENT_SHARD_ELITE_MULTIPLIER,
  ENCHANTMENT_SHARD_PROGRESSION_WEIGHTS,
  REPAIR_COST_DEFINITIONS,
  SEGMENT_LOOT_MULTIPLIERS,
  getDungeonKeyFragmentItemId,
  getDungeonKeyItemId,
  type CombatDropKind,
  type CombatLootItemSource,
  type CombatLootRateModel,
  type RepairCostDefinitionData,
  type WorldBandId,
} from "@game/data";

export {
  ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE,
  BASE_COMBAT_DROP_RATES,
  BOSS_SPECIAL_DROP_MULTIPLIER,
  COMBAT_LOOT_RULES,
  DUNGEON_KEY_PROGRESSION_WEIGHTS,
  ENCHANTMENT_SHARD_BASE_EXPECTED_PER_KILL,
  ENCHANTMENT_SHARD_BOSS_MULTIPLIER,
  ENCHANTMENT_SHARD_DEPTH_BONUS_PER_SEGMENT,
  ENCHANTMENT_SHARD_ELITE_MULTIPLIER,
  ENCHANTMENT_SHARD_PROGRESSION_WEIGHTS,
  GENERAL_VENDOR_FIXED_OFFERS,
  HEALTH_POTION_COOLDOWN_SECONDS,
  HEALTH_POTION_HEAL_RATIO,
  KEY_FRAGMENTS_PER_KEY,
  REPAIR_COST_DEFINITIONS,
  SEGMENT_LOOT_MULTIPLIERS,
  type CombatDropKind,
  type RepairCostDefinitionData,
} from "@game/data";

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

export interface CombatDrop {
  readonly itemId: string;
  readonly kind: CombatDropKind;
  readonly quantity: number;
}

export interface CombatLootContext {
  readonly segmentIndex: number;
  readonly faction: string;
  readonly isElite: boolean;
  readonly isBoss: boolean;
  readonly isFinalBoss: boolean;
  readonly enchantmentTier: number;
  readonly enchantmentDropWeight: number;
  readonly dungeonKeyDropWeight: number;
}

export interface CombatLootExpectation {
  readonly itemId: string;
  readonly kind: CombatDropKind;
  readonly expectedQuantity: number;
}

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
  context: Pick<CombatLootContext, "segmentIndex" | "isElite" | "isBoss" | "enchantmentDropWeight">,
): number {
  const depthBonus = 1 + Math.max(0, context.segmentIndex) * ENCHANTMENT_SHARD_DEPTH_BONUS_PER_SEGMENT;
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

function resolveCombatLootItemId(source: CombatLootItemSource, context: CombatLootContext): string {
  if (source.type === "fixed") return source.itemId;
  if (source.type === "enchantment_shard") return getEnchantmentShardItemId(context.enchantmentTier);
  if (source.type === "dungeon_key_fragment") return getDungeonKeyFragmentItemId(context.enchantmentTier);
  return getDungeonKeyItemId(context.enchantmentTier);
}

function resolveCombatLootExpectedQuantity(rate: CombatLootRateModel, context: CombatLootContext): number {
  if (rate.type === "enchantment") return getEnchantmentShardExpectedDrop(context);
  if (rate.type === "dungeon_key") {
    const bossMultiplier = rate.bossMultiplier && context.isBoss ? BOSS_SPECIAL_DROP_MULTIPLIER : 1;
    return rate.baseRate * Math.max(0, context.dungeonKeyDropWeight) * bossMultiplier;
  }
  const bossMultiplier = rate.bossMultiplier && context.isBoss ? BOSS_SPECIAL_DROP_MULTIPLIER : 1;
  return rate.baseRate * getSegmentLootMultiplier(context.segmentIndex) * bossMultiplier;
}

export function getCombatLootExpectations(context: CombatLootContext): readonly CombatLootExpectation[] {
  return COMBAT_LOOT_RULES.flatMap((rule) => {
    const expectedQuantity = resolveCombatLootExpectedQuantity(rule.rate, context);
    if (expectedQuantity <= 0) return [];
    return [{ itemId: resolveCombatLootItemId(rule.item, context), kind: rule.kind, expectedQuantity }];
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
    drops.push({ itemId: expectation.itemId, kind: expectation.kind, quantity });
  }
  return drops;
}

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
