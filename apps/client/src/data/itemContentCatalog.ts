import { ENCHANTMENT_MINIMUM_ITEM_TIER, type EquipmentInfoLike } from "@game/gameplay";
import { WEAPON_ITEM_DEFINITIONS } from "./weaponContentCatalog.js";
import { getWeaponAttackSpeed, getItemTier } from "./itemPower.js";
import {
  EQUIPMENT_CRAFT_RECIPES,
  BIRCH_PLANK_RECIPE,
  COPPER_BAR_RECIPE,
  PINE_PLANK_RECIPE,
  IRON_BAR_RECIPE,
} from "./refiningRecipes.js";

const HERO_BASE_ATTACK_SPEED = 1.2;

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

/**
 * Equipment definitions are composed from their authoritative catalogs.
 * Weapon entries must never be manually re-authored here.
 */
export const ITEM_DEFINITIONS: Record<string, EquipmentInfoLike> = {
  ...WEAPON_ITEM_DEFINITIONS,
  ...NON_WEAPON_ITEM_DEFINITIONS,
};

/** Resolve equipment info from static definitions. */
export function resolveEquipmentInfo(itemId: string): EquipmentInfoLike | undefined {
  const definition = ITEM_DEFINITIONS[itemId];
  if (definition === undefined) return undefined;

  // Attack speed belongs exclusively to the weapon profile. Any attack-speed
  // bonus accidentally added to equipment data is ignored by this boundary.
  const { stat_attack_speed: _ignoredAttackSpeed, ...stats } = definition.stats ?? {};
  const intrinsicAttackSpeed = getWeaponAttackSpeed(itemId);
  if (definition.slot !== "weapon" || intrinsicAttackSpeed === undefined) {
    return { ...definition, stats };
  }

  return {
    ...definition,
    stats: {
      ...stats,
      stat_attack_speed: intrinsicAttackSpeed - HERO_BASE_ATTACK_SPEED,
    },
  };
}

export function resolveEnchantmentItemInfo(itemId: string) {
  const definition = ITEM_DEFINITIONS[itemId];
  if (definition === undefined) return undefined;
  const explicitTier = getItemTier(itemId);
  const parsedTier = Number(itemId.match(/_t(\d+)(?:_|$)/)?.[1] ?? 0);
  const itemTier = explicitTier ?? (parsedTier >= 3 ? parsedTier : 3);
  const costCategory =
    definition.slot === "weapon"
      ? definition.handling === "two_handed"
        ? "two_handed_weapon" as const
        : "one_handed_weapon" as const
      : definition.slot === "off_hand"
        ? "off_hand" as const
        : definition.slot === "cape"
          ? "cape" as const
          : "armor" as const;
  const craftRecipe = EQUIPMENT_CRAFT_RECIPES.find(
    (recipe) => recipe.outputItemId === itemId,
  );
  return {
    enchantable:
      itemTier >= ENCHANTMENT_MINIMUM_ITEM_TIER
      && craftRecipe !== undefined,
    maximumLevel: 3 as const,
    itemTier,
    costCategory,
    craftMaterials:
      craftRecipe?.requirements
        .filter((requirement) => requirement.itemId.startsWith("item_refined_"))
        .map((requirement) => ({
          itemId: requirement.itemId,
          quantity: requirement.quantity,
        })) ?? [],
  };
}

/**
 * 13_ITEM_SYSTEM: two items with the same definition, tier, quality and
 * enchantment share one inventory stack. The current vertical slice only
 * exposes one variant per itemId, so itemId is the complete stack identity.
 */
export function resolveItemStackInfo(itemId: string) {
  const catalogStackInfo = resolveCatalogStackInfo(itemId);
  if (catalogStackInfo !== undefined) return catalogStackInfo;
  if (ITEM_DEFINITIONS[itemId] !== undefined) {
    return { itemId, stackable: true, maxStack: 20 };
  }
  if (itemId === "item_health_potion" || itemId === "item_energy_potion") {
    return { itemId, stackable: true, maxStack: 99 };
  }
  if (itemId.startsWith("item_resource_") || itemId.startsWith("item_refined_")) {
    return { itemId, stackable: true, maxStack: 999 };
  }
  if (
    itemId === BIRCH_PLANK_RECIPE.rawItemId ||
    itemId === BIRCH_PLANK_RECIPE.outputItemId ||
    itemId === COPPER_BAR_RECIPE.rawItemId ||
    itemId === COPPER_BAR_RECIPE.outputItemId ||
    itemId === PINE_PLANK_RECIPE.rawItemId ||
    itemId === PINE_PLANK_RECIPE.outputItemId ||
    itemId === IRON_BAR_RECIPE.rawItemId ||
    itemId === IRON_BAR_RECIPE.outputItemId
  ) {
    return { itemId, stackable: true, maxStack: 999 };
  }
  return undefined;
}

export function resolveRepairableInfo(itemId: string): { itemId: string; equipmentCategory: string; itemTier: number } | undefined {
  const info = ITEM_DEFINITIONS[itemId];
  const itemTier = getItemTier(itemId);
  if (info === undefined || itemTier === undefined) {
    return undefined;
  }
  if (info.slot === "weapon") {
    return { itemId, equipmentCategory: "weapon", itemTier };
  }
  if (info.slot === "cape" || info.slot === "off_hand") {
    return { itemId, equipmentCategory: "accessory", itemTier };
  }
  return { itemId, equipmentCategory: "armor", itemTier };
}
