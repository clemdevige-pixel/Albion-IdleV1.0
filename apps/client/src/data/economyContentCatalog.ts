import { getEnchantmentShardItemId } from "@game/gameplay";

export interface LootDropDefinition {
  readonly itemId: string;
  readonly weight: number;
}

export interface LootTableDefinition {
  readonly dropChance: number;
  readonly drops: readonly LootDropDefinition[];
}

/**
 * BLUE POLISH 1
 * Combat loot is intentionally split into independent rolls. A key fragment,
 * an enchantment shard and a potion can therefore drop from the same kill.
 * Faction selects the identity of dungeon/artifact loot; encounter difficulty
 * selects the probability.
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
  healthPotion: 0.05,
  keyFragment: 0.02,
  completeKey: 0.001,
} as const;

/**
 * Provisional enchantment-drop calibration.
 *
 * Shards are intentionally not assigned one fixed chance per monster. The
 * caller provides a weight derived from the actual combat profile so tougher
 * enemies compensate for their lower kill rate. A small depth bonus makes
 * advancing within a zone slightly preferable to farming segment 1 forever.
 * The future TTK balance pass can retune these values without changing item or
 * recipe data.
 */
export const ENCHANTMENT_SHARD_BASE_EXPECTED_PER_KILL = 0.05;
export const ENCHANTMENT_SHARD_DEPTH_BONUS_PER_SEGMENT = 0.02;
export const ENCHANTMENT_SHARD_ELITE_MULTIPLIER = 1.35;
export const ENCHANTMENT_SHARD_BOSS_MULTIPLIER = 2;

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

function normalizeFactionId(faction: string): string {
  return faction.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function rollChance(chance: number, random: () => number): boolean {
  return random() < Math.min(1, Math.max(0, chance));
}

/**
 * Supports expected values above 1 without probability caps distorting later
 * balance: whole units are guaranteed and only the fractional remainder rolls.
 */
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
  const eliteMultiplier = context.isElite ? ENCHANTMENT_SHARD_ELITE_MULTIPLIER : 1;
  const bossMultiplier = context.isBoss ? ENCHANTMENT_SHARD_BOSS_MULTIPLIER : 1;
  return ENCHANTMENT_SHARD_BASE_EXPECTED_PER_KILL
    * Math.max(0, context.enchantmentDropWeight)
    * depthBonus
    * eliteMultiplier
    * bossMultiplier;
}

export function rollBlueZoneCombatDrops(
  context: BlueZoneLootContext,
  random: () => number = Math.random,
): readonly BlueZoneCombatDrop[] {
  const drops: BlueZoneCombatDrop[] = [];
  const segmentMultiplier = getBlueZoneSegmentLootMultiplier(context.segmentIndex);
  const specialMultiplier = context.isBoss ? BOSS_SPECIAL_DROP_MULTIPLIER : 1;
  const factionId = normalizeFactionId(context.faction);

  // Consumable: scales with zone advancement, but does not receive the boss
  // special-drop multiplier.
  if (rollChance(BLUE_ZONE_BASE_DROP_RATES.healthPotion * segmentMultiplier, random)) {
    drops.push({ itemId: "item_health_potion", kind: "consumable", quantity: 1 });
  }

  // Exactly one enchantment resource exists per world tier. Its expected drop
  // follows monster difficulty rather than a universal per-kill percentage.
  const shardQuantity = rollExpectedQuantity(
    getEnchantmentShardExpectedDrop(context),
    random,
  );
  if (shardQuantity > 0) {
    drops.push({
      itemId: getEnchantmentShardItemId(context.enchantmentTier),
      kind: "enchantment",
      quantity: shardQuantity,
    });
  }

  // Dungeon progression is faction-specific, but rates are faction-agnostic.
  if (rollChance(BLUE_ZONE_BASE_DROP_RATES.keyFragment * segmentMultiplier * specialMultiplier, random)) {
    drops.push({ itemId: `item_resource_key_fragment_${factionId}`, kind: "key_fragment", quantity: 1 });
  }
  if (rollChance(BLUE_ZONE_BASE_DROP_RATES.completeKey * segmentMultiplier * specialMultiplier, random)) {
    drops.push({ itemId: `item_resource_dungeon_key_${factionId}`, kind: "key", quantity: 1 });
  }

  // Artifact progression is boss-exclusive. Final biome bosses use the
  // stronger final-boss rates approved for the Blue Zone vertical slice.
  if (context.isBoss) {
    const fragmentChance = context.isFinalBoss
      ? BLUE_ZONE_BOSS_DROP_RATES.finalBossArtifactFragment
      : BLUE_ZONE_BOSS_DROP_RATES.segmentBossArtifactFragment;
    const artifactChance = context.isFinalBoss
      ? BLUE_ZONE_BOSS_DROP_RATES.finalBossArtifact
      : BLUE_ZONE_BOSS_DROP_RATES.segmentBossArtifact;

    if (rollChance(fragmentChance, random)) {
      drops.push({ itemId: `item_resource_artifact_fragment_${factionId}`, kind: "artifact_fragment", quantity: 1 });
    }
    if (rollChance(artifactChance, random)) {
      drops.push({ itemId: `item_resource_artifact_${factionId}`, kind: "artifact", quantity: 1 });
    }
  }

  return drops;
}

// Legacy tables are retained temporarily for compatibility with content that
// has not yet migrated to the independent-roll reward pipeline.
export const GENERIC_COMBAT_LOOT: readonly LootDropDefinition[] = [
  { itemId: "item_health_potion", weight: 20 },
];

export const MONSTER_LOOT_TABLES: Readonly<Record<string, LootTableDefinition>> = {
  loot_monster_generic: { dropChance: 0.2, drops: GENERIC_COMBAT_LOOT },
  loot_monster_undead_boss: { dropChance: 0.2, drops: GENERIC_COMBAT_LOOT },
  loot_monster_keeper_boss: { dropChance: 0.2, drops: GENERIC_COMBAT_LOOT },
  loot_undead_normal: { dropChance: 0.2, drops: GENERIC_COMBAT_LOOT },
  loot_undead_elite: { dropChance: 0.3, drops: GENERIC_COMBAT_LOOT },
  loot_undead_boss: { dropChance: 0.45, drops: GENERIC_COMBAT_LOOT },
  loot_morgana_normal: { dropChance: 0.2, drops: GENERIC_COMBAT_LOOT },
  loot_morgana_elite: { dropChance: 0.3, drops: GENERIC_COMBAT_LOOT },
  loot_morgana_boss: { dropChance: 0.45, drops: GENERIC_COMBAT_LOOT },
  loot_keeper_normal: { dropChance: 0.2, drops: GENERIC_COMBAT_LOOT },
  loot_keeper_elite: { dropChance: 0.3, drops: GENERIC_COMBAT_LOOT },
  loot_keeper_boss: { dropChance: 0.45, drops: GENERIC_COMBAT_LOOT },
};

export const HEALTH_POTION_HEAL_RATIO = 0.3;
export const HEALTH_POTION_COOLDOWN_SECONDS = 20;

export const ENCHANTMENT_MATERIAL_NAMES: Readonly<Record<string, string>> = {
  item_resource_enchantment_shard_t4: "Éclat d’enchantement T4",
  item_resource_enchantment_shard_t5: "Éclat d’enchantement T5",
  item_resource_enchantment_shard_t6: "Éclat d’enchantement T6",
  item_resource_enchantment_shard_t7: "Éclat d’enchantement T7",
  item_resource_enchantment_shard_t8: "Éclat d’enchantement T8",
  // Legacy save labels: these resources are no longer produced or consumed.
  item_resource_enchantment_essence: "Essence d’enchantement (ancienne)",
  item_resource_arcane_crystal: "Cristal arcanique (ancien)",
  item_resource_enchantment_catalyst: "Catalyseur d’enchantement (ancien)",
};

/** @deprecated Use rollBlueZoneCombatDrops with a tiered loot context. */
export function rollEnchantmentMaterial(): string | undefined {
  return Math.random() < ENCHANTMENT_SHARD_BASE_EXPECTED_PER_KILL
    ? getEnchantmentShardItemId(4)
    : undefined;
}

/** @deprecated Blue Zone combat uses rollBlueZoneCombatDrops. */
export function rollLootTable(lootTableId: string): string | undefined {
  const table = MONSTER_LOOT_TABLES[lootTableId];
  if (table === undefined) throw new Error(`Unknown monster loot table: ${lootTableId}`);
  if (Math.random() > table.dropChance) return undefined;
  const totalWeight = table.drops.reduce((sum, definition) => sum + definition.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const definition of table.drops) {
    roll -= definition.weight;
    if (roll <= 0) return definition.itemId;
  }
  return undefined;
}

export function rollGenericCombatLoot(): string | undefined {
  return rollLootTable("loot_monster_generic");
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
