import type { WorldBandId } from "./world-bands.js";

/** Generic depth curve retained for non-enchantment loot families. */
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

export const ENCHANTMENT_SHARD_BASE_EXPECTED_PER_KILL = 0.0165;
export const ENCHANTMENT_SHARD_DEPTH_BONUS_PER_SEGMENT = 0.015;
export const ENCHANTMENT_SHARD_ELITE_MULTIPLIER = 1.2;
export const ENCHANTMENT_SHARD_BOSS_MULTIPLIER = 1.35;

export interface EnchantmentShardZoneProgressionWeight {
  readonly start: number;
  readonly end: number;
}

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
  blue: [
    { start: 0.35, end: 0.5 },
    { start: 0.5, end: 0.9 },
    { start: 0.9, end: 2.0 },
    { start: 3.8, end: 6.5 },
    { start: 6.8, end: 9.5 },
  ],
  yellow: [
    { start: 3.5, end: 5.5 },
    { start: 4.8, end: 6.2 },
    { start: 5.8, end: 7.4 },
    { start: 7.6, end: 10.2 },
    { start: 9.0, end: 10.5 },
  ],
  orange: [
    { start: 4.2, end: 6.6 },
    { start: 5.76, end: 7.44 },
    { start: 6.96, end: 8.88 },
    { start: 9.12, end: 12.24 },
    { start: 10.8, end: 12.6 },
  ],
  red: [
    { start: 4.2, end: 6.6 },
    { start: 5.76, end: 7.44 },
    { start: 6.96, end: 8.88 },
    { start: 9.12, end: 12.24 },
    { start: 10.8, end: 12.6 },
  ],
  black: [
    { start: 4.2, end: 6.6 },
    { start: 5.76, end: 7.44 },
    { start: 6.96, end: 8.88 },
    { start: 9.12, end: 12.24 },
    { start: 10.8, end: 12.6 },
  ],
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

export type CombatLootItemSource =
  | { readonly type: "fixed"; readonly itemId: string }
  | { readonly type: "enchantment_shard" }
  | { readonly type: "dungeon_key_fragment" }
  | { readonly type: "dungeon_key" };

export type CombatLootRateModel =
  | { readonly type: "segment_scaled"; readonly baseRate: number; readonly bossMultiplier: boolean }
  | { readonly type: "dungeon_key"; readonly baseRate: number; readonly bossMultiplier: boolean }
  | { readonly type: "enchantment" };

export interface CombatLootRuleDefinition {
  readonly kind: CombatDropKind;
  readonly item: CombatLootItemSource;
  readonly rate: CombatLootRateModel;
}

/** Authored world-combat loot channels. Runtime logic resolves item ids and quantities. */
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

export const HEALTH_POTION_HEAL_RATIO = 0.3;
export const HEALTH_POTION_COOLDOWN_SECONDS = 20;

export interface RepairCostDefinitionData {
  readonly equipmentCategory: "weapon" | "armor" | "accessory";
  readonly itemTier: number;
  readonly baseRepairCost: number;
  readonly costMultiplier: number;
  readonly enabled: boolean;
}

export const REPAIR_COST_DEFINITIONS: readonly RepairCostDefinitionData[] = [
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
] as const;
