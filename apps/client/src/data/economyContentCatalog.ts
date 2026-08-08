export interface LootDropDefinition {
  readonly itemId: string;
  readonly weight: number;
}

export const GENERIC_COMBAT_LOOT: readonly LootDropDefinition[] = [
  { itemId: "item_health_potion", weight: 20 },
  { itemId: "item_energy_potion", weight: 15 },
];

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

export function rollGenericCombatLoot(): string | undefined {
  if (Math.random() > 0.2) return undefined;
  const totalWeight = GENERIC_COMBAT_LOOT.reduce(
    (sum, definition) => sum + definition.weight,
    0,
  );
  let roll = Math.random() * totalWeight;
  for (const definition of GENERIC_COMBAT_LOOT) {
    roll -= definition.weight;
    if (roll <= 0) return definition.itemId;
  }
  return undefined;
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
