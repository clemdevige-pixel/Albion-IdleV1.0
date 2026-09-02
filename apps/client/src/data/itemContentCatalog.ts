import {
  CONSUMABLE_STACK_LIMITS,
  ITEM_STACK_LIMITS,
  STANDALONE_NON_WEAPON_ITEM_DEFINITIONS,
} from "@game/data";
import { ENCHANTMENT_MINIMUM_ITEM_TIER, type EquipmentInfoLike } from "@game/gameplay";
import { WEAPON_ITEM_DEFINITIONS } from "./weaponContentCatalog.js";
import {
  PROGRESSION_NON_WEAPON_ITEM_DEFINITIONS,
} from "./nonWeaponEquipmentContentCatalog.js";
import {
  FACTION_CAPE_CRAFT_RECIPES,
  FACTION_CAPE_ITEM_DEFINITIONS,
} from "./factionCapeContentCatalog.js";
import { getWeaponAttackSpeed, getItemTier } from "./itemPower.js";
import { EQUIPMENT_CRAFT_RECIPES } from "./refiningRecipes.js";
import {
  ARTIFACT_WEAPON_CRAFT_RECIPES,
  isArtifactWeaponCraftOutput,
} from "./artifactWeaponCraftRecipes.js";

const HERO_BASE_ATTACK_SPEED = 1.2;
const ALL_EQUIPMENT_CRAFT_RECIPES = [
  ...EQUIPMENT_CRAFT_RECIPES.filter(
    (recipe) => !isArtifactWeaponCraftOutput(recipe.outputItemId),
  ),
  ...ARTIFACT_WEAPON_CRAFT_RECIPES,
  ...FACTION_CAPE_CRAFT_RECIPES,
] as const;

/**
 * Non-weapon equipment content. Conventional tier-progressing equipment is
 * derived from nonWeaponEquipmentContentCatalog; standalone/specialized
 * equipment is composed from its own authoritative catalogs.
 */
export const NON_WEAPON_ITEM_DEFINITIONS: Readonly<Record<string, EquipmentInfoLike>> = {
  ...PROGRESSION_NON_WEAPON_ITEM_DEFINITIONS,
  ...FACTION_CAPE_ITEM_DEFINITIONS,
  ...STANDALONE_NON_WEAPON_ITEM_DEFINITIONS,
};

export const CONSUMABLE_STACK_DEFINITIONS: Readonly<Record<string, number>> =
  CONSUMABLE_STACK_LIMITS;

export function resolveCatalogStackInfo(itemId: string) {
  if (NON_WEAPON_ITEM_DEFINITIONS[itemId] !== undefined) {
    return { itemId, stackable: true, maxStack: ITEM_STACK_LIMITS.equipment };
  }
  const consumableMaxStack = CONSUMABLE_STACK_DEFINITIONS[itemId];
  if (consumableMaxStack !== undefined) {
    return { itemId, stackable: true, maxStack: consumableMaxStack };
  }
  if (itemId.startsWith("item_resource_") || itemId.startsWith("item_refined_")) {
    return { itemId, stackable: true, maxStack: ITEM_STACK_LIMITS.resource };
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
          : definition.slot === "head"
            ? "armor_head" as const
            : definition.slot === "chest"
              ? "armor_torso" as const
              : "armor_boots" as const;
  const craftRecipe = ALL_EQUIPMENT_CRAFT_RECIPES.find(
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
        .filter((requirement) => (
          requirement.itemId.startsWith("item_refined_")
          || requirement.itemId.startsWith("item_resource_rune_")
        ))
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
    return { itemId, stackable: true, maxStack: ITEM_STACK_LIMITS.equipment };
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
