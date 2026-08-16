import { getEnchantmentShardItemId } from "@game/gameplay";
import type { WorldBandId } from "@game/data";

/**
 * Combat loot uses independent rolls. A key fragment, an enchantment shard and
 * other eligible rewards can therefore drop from the same kill. The definitions
 * below are also consumed by the Bestiary so gameplay and UI share one source
 * of truth.
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
 * Enchantment shard calibration.
 *
 * Shard progression is authored independently from enemy HP. The old temporary
 * HP-ratio weight made bands with wider HP curves (Blue) inherently more
 * rewarding than bands with flatter curves (Yellow), even though T4 and T5
 * shards are separate progression resources.
 *
 * Each zone owns a start/end progression weight which interpolates across its
 * ten segments. This lets shard income follow actual enchantment walls while
 * preserving a strong incentive to farm deeper accessible segments.
 */
export const ENCHANTMENT_SHARD_BASE_EXPECTED_PER_KILL = 0.011;
export const ENCHANTMENT_SHARD_DEPTH_BONUS_PER_SEGMENT = 0.015;
export const ENCHANTMENT_SHARD_ELITE_MULTIPLIER = 1.2;
export const ENCHANTMENT_SHARD_BOSS_MULTIPLIER = 1.35;

export interface EnchantmentShardZoneProgressionWeight {
  readonly start: number;
  readonly end: number;
}

export const ENCHANTMENT_SHARD_PROGRESSION_WEIGHTS: Partial<
  Readonly<Record<WorldBandId, readonly EnchantmentShardZoneProgressionWeight[]>>
> = {
  // Blue: enchantment becomes a major lever in Steppe, then ramps toward the
  // T4.2/T4.3 Mountain walls. Early T3 zones deliberately remain inefficient.
  blue: [
    { start: 0.35, end: 0.5 },
    { start: 0.5, end: 0.9 },
    { start: 0.9, end: 2.0 },
    { start: 3.8, end: 6.5 },
    { start: 6.8, end: 9.5 },
  ],
  // Yellow: T5.1 appears early, T5.2 around Stormwatch/Sunscar and T5.3 is a
  // late-band comfort target. Sunscar ramps into the late-game farm window;
  // Ironveil keeps improving with depth but caps its fastest clears near the
  // intended ~55-70 shards/hour end-of-band envelope.
  yellow: [
    { start: 3.5, end: 5.5 },
    { start: 4.8, end: 6.2 },
    { start: 5.8, end: 7.4 },
    { start: 7.6, end: 10.2 },
    { start: 9.0, end: 10.5 },
  ],
} as const;

export function getEnchantmentShardProgressionWeight(
  bandId: WorldBandId,
  zoneIndexWithinBand: number,
  segmentIndex: number,
): number {
  const bandWeights = ENCHANTMENT_SHARD_PROGRESSION_WEIGHTS[bandId];
  const zone = bandWeights?.[zoneIndexWithinBand];
  if (zone === undefined) return 0;
  const clampedSegment = Math.max(0, Math.min(9, Math.floor(segmentIndex)));
  const progress = clampedSegment / 9;
  return zone.start + (zone.end - zone.start) * progress;
}

export const BOSS_DROP_RATES = {
  segmentBossArtifactFragment: 0.2,
  segmentBossArtifact: 0.005,
  finalBossArtifactFragment: 0.4,
  finalBossArtifact: 0.015,
} as const;

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
  readonly kind: CombatDropKind;
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
    rate: { type: "segment_scaled", baseRate: BASE_COMBAT_DROP_RATES.keyFragment, bossMultiplier: true },
  },
  {
    kind: "key",
    item: { type: "faction", prefix: "item_resource_dungeon_key_" },
    rate: { type: "segment_scaled", baseRate: BASE_COMBAT_DROP_RATES.completeKey, bossMultiplier: true },
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

function resolveCombatLootItemId(source: CombatLootItemSource, context: CombatLootContext): string {
  if (source.type === "fixed") return source.itemId;
  if (source.type === "enchantment_shard") return getEnchantmentShardItemId(context.enchantmentTier);
  return `${source.prefix}${context.faction}`;
}

export function getEnchantmentShardExpectedDrop(input: {
  readonly segmentIndex: number;
  readonly isElite: boolean;
  readonly isBoss: boolean;
  readonly enchantmentDropWeight: number;
}): number {
  const depthMultiplier = 1 + input.segmentIndex * ENCHANTMENT_SHARD_DEPTH_BONUS_PER_SEGMENT;
  const specialMultiplier = input.isBoss
    ? ENCHANTMENT_SHARD_BOSS_MULTIPLIER
    : input.isElite
      ? ENCHANTMENT_SHARD_ELITE_MULTIPLIER
      : 1;
  return ENCHANTMENT_SHARD_BASE_EXPECTED_PER_KILL
    * input.enchantmentDropWeight
    * depthMultiplier
    * specialMultiplier;
}

function getCombatLootExpectedQuantity(
  rule: CombatLootRuleDefinition,
  context: CombatLootContext,
): number {
  if (rule.rate.type === "enchantment") {
    return getEnchantmentShardExpectedDrop({
      segmentIndex: context.segmentIndex,
      isElite: context.isElite,
      isBoss: context.isBoss,
      enchantmentDropWeight: context.enchantmentDropWeight,
    });
  }

  if (rule.rate.type === "segment_scaled") {
    const segmentMultiplier = SEGMENT_LOOT_MULTIPLIERS[context.segmentIndex] ?? 1;
    const bossMultiplier = rule.rate.bossMultiplier && (context.isElite || context.isBoss)
      ? BOSS_SPECIAL_DROP_MULTIPLIER
      : 1;
    return rule.rate.baseRate * segmentMultiplier * bossMultiplier;
  }

  if (rule.rate.type === "artifact_fragment") {
    if (!context.isBoss) return 0;
    return context.isFinalBoss
      ? BOSS_DROP_RATES.finalBossArtifactFragment
      : BOSS_DROP_RATES.segmentBossArtifactFragment;
  }

  if (!context.isBoss) return 0;
  return context.isFinalBoss
    ? BOSS_DROP_RATES.finalBossArtifact
    : BOSS_DROP_RATES.segmentBossArtifact;
}

export function getCombatLootExpectations(context: CombatLootContext): readonly CombatLootExpectation[] {
  return COMBAT_LOOT_RULES.map((rule) => ({
    itemId: resolveCombatLootItemId(rule.item, context),
    kind: rule.kind,
    expectedQuantity: getCombatLootExpectedQuantity(rule, context),
  })).filter((drop) => drop.expectedQuantity > 0);
}

export function rollCombatLoot(context: CombatLootContext, random: () => number = Math.random): readonly CombatDrop[] {
  return getCombatLootExpectations(context).flatMap((drop) => {
    const guaranteed = Math.floor(drop.expectedQuantity);
    const fractional = drop.expectedQuantity - guaranteed;
    const quantity = guaranteed + (random() < fractional ? 1 : 0);
    return quantity > 0 ? [{ itemId: drop.itemId, kind: drop.kind, quantity }] : [];
  });
}
