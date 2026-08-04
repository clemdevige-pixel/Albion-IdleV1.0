import type { EquipmentInfoLike } from "@game/gameplay";

/**
 * Non-weapon equipment content. Weapon entries live in weaponContentCatalog.
 * Future armor, off-hand and cape definitions belong here, never in React.
 */
export const NON_WEAPON_ITEM_DEFINITIONS: Readonly<
  Record<string, EquipmentInfoLike>
> = {
  item_leather_armor: {
    itemId: "item_leather_armor",
    slot: "chest",
    handling: "one_handed",
    stats: { stat_armor: 8, stat_max_health: 50 },
  },
  item_wooden_shield: {
    itemId: "item_wooden_shield",
    slot: "off_hand",
    handling: "one_handed",
    stats: { stat_armor: 5, stat_magic_resistance: 3 },
  },
  item_shield_t3_reinforced: {
    itemId: "item_shield_t3_reinforced",
    slot: "off_hand",
    handling: "one_handed",
    stats: { stat_armor: 9, stat_magic_resistance: 5 },
  },
  item_shield_t4_reinforced: {
    itemId: "item_shield_t4_reinforced",
    slot: "off_hand",
    handling: "one_handed",
    stats: { stat_armor: 15, stat_magic_resistance: 9 },
  },
  item_iron_helmet: {
    itemId: "item_iron_helmet",
    slot: "head",
    handling: "one_handed",
    stats: { stat_armor: 4, stat_max_health: 30 },
  },
  item_leather_boots: {
    itemId: "item_leather_boots",
    slot: "boots",
    handling: "one_handed",
    stats: { stat_armor: 3 },
  },
  item_traveler_cape: {
    itemId: "item_traveler_cape",
    slot: "cape",
    handling: "one_handed",
    stats: { stat_magic_resistance: 4 },
  },
  item_helmet_t4_reinforced: {
    itemId: "item_helmet_t4_reinforced",
    slot: "head",
    handling: "one_handed",
    stats: { stat_armor: 8, stat_max_health: 55 },
  },
  item_armor_t4_leather: {
    itemId: "item_armor_t4_leather",
    slot: "chest",
    handling: "one_handed",
    stats: { stat_armor: 14, stat_max_health: 90 },
  },
  item_boots_t4_leather: {
    itemId: "item_boots_t4_leather",
    slot: "boots",
    handling: "one_handed",
    stats: { stat_armor: 6 },
  },
};

export const CONSUMABLE_STACK_DEFINITIONS: Readonly<Record<string, number>> = {
  item_health_potion: 99,
  item_energy_potion: 99,
};

export function resolveCatalogStackInfo(itemId: string) {
  if (NON_WEAPON_ITEM_DEFINITIONS[itemId] !== undefined) {
    return { itemId, stackable: true, maxStack: 20 };
  }
  const consumableMaxStack = CONSUMABLE_STACK_DEFINITIONS[itemId];
  if (consumableMaxStack !== undefined) {
    return { itemId, stackable: true, maxStack: consumableMaxStack };
  }
  if (itemId.startsWith("item_resource_") || itemId.startsWith("item_refined_")) {
    return { itemId, stackable: true, maxStack: 999 };
  }
  return undefined;
}
