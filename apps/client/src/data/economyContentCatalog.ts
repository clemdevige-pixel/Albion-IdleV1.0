export interface LootDropDefinition {
  readonly itemId: string;
  readonly weight: number;
}

export interface LootTableDefinition {
  readonly dropChance: number;
  readonly drops: readonly LootDropDefinition[];
}

export const GENERIC_COMBAT_LOOT: readonly LootDropDefinition[] = [
  { itemId: "item_health_potion", weight: 20 },
  { itemId: "item_energy_potion", weight: 15 },
];

const UNDEAD_COMBAT_LOOT: readonly LootDropDefinition[] = [
  { itemId: "item_health_potion", weight: 20 },
];

const MORGANA_COMBAT_LOOT: readonly LootDropDefinition[] = [
  { itemId: "item_health_potion", weight: 20 },
];

export const MONSTER_LOOT_TABLES: Readonly<Record<string, LootTableDefinition>> = {
  loot_monster_generic: {
    dropChance: 0.2,
    drops: GENERIC_COMBAT_LOOT,
  },
  loot_monster_undead_boss: {
    dropChance: 0.2,
    drops: GENERIC_COMBAT_LOOT,
  },
  loot_monster_keeper_boss: {
    dropChance: 0.2,
    drops: GENERIC_COMBAT_LOOT,
  },
  loot_undead_normal: {
    dropChance: 0.2,
    drops: UNDEAD_COMBAT_LOOT,
  },
  loot_undead_elite: {
    dropChance: 0.3,
    drops: UNDEAD_COMBAT_LOOT,
  },
  loot_undead_boss: {
    dropChance: 0.45,
    drops: UNDEAD_COMBAT_LOOT,
  },
  loot_morgana_normal: {
    dropChance: 0.2,
    drops: MORGANA_COMBAT_LOOT,
  },
  loot_morgana_elite: {
    dropChance: 0.3,
    drops: MORGANA_COMBAT_LOOT,
  },
  loot_morgana_boss: {
    dropChance: 0.45,
    drops: MORGANA_COMBAT_LOOT,
  },
};

export const HEALTH_POTION_HEAL_RATIO = 0.3;
export const HEALTH_POTION_COOLDOWN_SECONDS = 20;

export const ENCHANTMENT_MATERIAL_NAMES: Readonly<Record<string, string>> = {
  item_resource_enchantment_essence: "Essence d’enchantement",
  item_resource_arcane_crystal: "Cristal arcanique",
  item_resource_enchantment_catalyst: "Catalyseur d’enchantement",
};

export function rollEnchantmentMaterial(): string | undefined {
  const roll = Math.random();
  if (roll < 0.005) return "item_resource_enchantment_catalyst";
  if (roll < 0.025) return "item_resource_arcane_crystal";
  if (roll < 0.105) return "item_resource_enchantment_essence";
  return undefined;
}

export function rollLootTable(lootTableId: string): string | undefined {
  const table = MONSTER_LOOT_TABLES[lootTableId];
  if (table === undefined) {
    throw new Error(`Unknown monster loot table: ${lootTableId}`);
  }
  if (Math.random() > table.dropChance) return undefined;
  const totalWeight = table.drops.reduce(
    (sum, definition) => sum + definition.weight,
    0,
  );
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
  { itemId: "item_energy_potion", buyPrice: 75, sellPrice: 30, maxPerTransaction: null, enabled: true },
  { itemId: "item_leather_armor", buyPrice: null, sellPrice: 60, maxPerTransaction: null, enabled: true },
  { itemId: "item_wooden_shield", buyPrice: null, sellPrice: 48, maxPerTransaction: null, enabled: true },
  { itemId: "item_shield_t3_reinforced", buyPrice: null, sellPrice: 90, maxPerTransaction: null, enabled: true },
  { itemId: "item_iron_helmet", buyPrice: null, sellPrice: 70, maxPerTransaction: null, enabled: true },
  { itemId: "item_leather_boots", buyPrice: null, sellPrice: 55, maxPerTransaction: null, enabled: true },
  { itemId: "item_traveler_cape", buyPrice: null, sellPrice: 65, maxPerTransaction: null, enabled: true },
];
