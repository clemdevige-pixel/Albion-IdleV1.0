import {
  ABYSSAL_LEATHER_RECIPE,
  ASHEN_PLANK_RECIPE,
  AUTHORED_REFINING_RECIPES,
  BADON_TEMPORARY_RECIPE,
  BIRCH_PLANK_RECIPE,
  BLOODOAK_PLANK_RECIPE,
  CEDAR_PLANK_RECIPE,
  COPPER_BAR_RECIPE,
  EBONY_PLANK_RECIPE,
  FINE_CLOTH_RECIPE,
  HARDENED_LEATHER_RECIPE,
  HEAVY_LEATHER_RECIPE,
  IRON_BAR_RECIPE,
  LINEN_CLOTH_RECIPE,
  METEORITE_BAR_RECIPE,
  OBSIDIAN_BAR_RECIPE,
  ORNATE_CLOTH_RECIPE,
  PINE_PLANK_RECIPE,
  REINFORCED_LEATHER_RECIPE,
  RUNITE_BAR_RECIPE,
  SCARLET_CLOTH_RECIPE,
  SOLAR_CLOTH_RECIPE,
  STURDY_LEATHER_RECIPE,
  THICK_LEATHER_RECIPE,
  TITANIUM_BAR_RECIPE,
  VOID_CLOTH_RECIPE,
  type AuthoredRefiningRecipe,
  type ProductionTier,
} from "@game/data";
import {
  WEAPON_ITEM_DEFINITIONS,
  getWeaponSpecializationName,
  resolveWeaponCraftRule,
  resolveWeaponFamilyId,
  resolveWeaponTier,
  type WeaponCraftMaterial,
} from "./weaponContentCatalog.js";
import {
  PROGRESSION_EQUIPMENT_CONTENT,
  type EquipmentCraftMaterial,
} from "./nonWeaponEquipmentContentCatalog.js";
import type { ProductionFamilyId } from "./productionFamilyCatalog.js";

export {
  ABYSSAL_LEATHER_RECIPE,
  ASHEN_PLANK_RECIPE,
  BADON_TEMPORARY_RECIPE,
  BIRCH_PLANK_RECIPE,
  BLOODOAK_PLANK_RECIPE,
  CEDAR_PLANK_RECIPE,
  COPPER_BAR_RECIPE,
  EBONY_PLANK_RECIPE,
  FINE_CLOTH_RECIPE,
  HARDENED_LEATHER_RECIPE,
  HEAVY_LEATHER_RECIPE,
  IRON_BAR_RECIPE,
  LINEN_CLOTH_RECIPE,
  METEORITE_BAR_RECIPE,
  OBSIDIAN_BAR_RECIPE,
  ORNATE_CLOTH_RECIPE,
  PINE_PLANK_RECIPE,
  REINFORCED_LEATHER_RECIPE,
  RUNITE_BAR_RECIPE,
  SCARLET_CLOTH_RECIPE,
  SOLAR_CLOTH_RECIPE,
  STURDY_LEATHER_RECIPE,
  THICK_LEATHER_RECIPE,
  TITANIUM_BAR_RECIPE,
  VOID_CLOTH_RECIPE,
};

export type ProductionRefiningRecipe = AuthoredRefiningRecipe;

export function getProductionRefiningRecipe(
  family: ProductionFamilyId,
  tier: ProductionTier,
): ProductionRefiningRecipe {
  const recipes = AUTHORED_REFINING_RECIPES[family];
  const recipe = recipes[tier];
  if (recipe === undefined) {
    throw new Error(`Refining content missing for ${family} T${String(tier)}`);
  }
  return recipe;
}

export function getWoodRecipe(tier: ProductionTier): ProductionRefiningRecipe {
  return getProductionRefiningRecipe("wood", tier);
}

export function getMetalRecipe(tier: ProductionTier): ProductionRefiningRecipe {
  return getProductionRefiningRecipe("ore", tier);
}

export function getLeatherRecipe(tier: ProductionTier): ProductionRefiningRecipe {
  return getProductionRefiningRecipe("hide", tier);
}

export function getClothRecipe(tier: ProductionTier): ProductionRefiningRecipe {
  return getProductionRefiningRecipe("fiber", tier);
}

const MATERIAL_ITEM_BY_KIND = {
  wood: (tier: ProductionTier) => getWoodRecipe(tier).outputItemId,
  metal: (tier: ProductionTier) => getMetalRecipe(tier).outputItemId,
  leather: (tier: ProductionTier) => getLeatherRecipe(tier).outputItemId,
  cloth: (tier: ProductionTier) => getClothRecipe(tier).outputItemId,
} as const;

function materialRequirement(
  material: WeaponCraftMaterial | EquipmentCraftMaterial,
  tier: ProductionTier,
) {
  return {
    itemId: MATERIAL_ITEM_BY_KIND[material.kind](tier),
    quantity: material.quantity,
  };
}

function createStandardWeaponRecipe(itemId: string) {
  const tier = resolveWeaponTier(itemId);
  const craft = resolveWeaponCraftRule(itemId);
  const family = resolveWeaponFamilyId(itemId);
  const name = getWeaponSpecializationName(itemId);
  if (tier === undefined || craft?.kind !== "standard" || family === undefined || name === undefined) {
    return undefined;
  }
  const requirements: Array<{ itemId: string; quantity: number }> = craft.materials.map(
    (material) => materialRequirement(material, tier),
  );
  return {
    id: `CRAFT_${itemId.replace("item_weapon_", "").toUpperCase()}_0`,
    family,
    name: `${name} T${String(tier)}`,
    tier,
    outputItemId: itemId,
    durationTicks: 0,
    requirements,
  };
}

export const STANDARD_WEAPON_CRAFT_RECIPES = Object.keys(WEAPON_ITEM_DEFINITIONS)
  .map(createStandardWeaponRecipe)
  .filter((recipe): recipe is NonNullable<typeof recipe> => recipe !== undefined);

function createProgressionEquipmentRecipe(
  family: (typeof PROGRESSION_EQUIPMENT_CONTENT)[number],
  item: (typeof PROGRESSION_EQUIPMENT_CONTENT)[number]["items"][number],
) {
  const requirements: Array<{ itemId: string; quantity: number }> = item.craftMaterials.map(
    (material) => materialRequirement(material, item.tier),
  );
  return {
    id: item.recipeId,
    family: family.recipeFamily,
    name: item.name,
    tier: item.tier,
    outputItemId: item.itemId,
    durationTicks: 0,
    requirements,
  };
}

export const STANDARD_NON_WEAPON_CRAFT_RECIPES = PROGRESSION_EQUIPMENT_CONTENT.flatMap(
  (family) => family.items.map((item) => createProgressionEquipmentRecipe(family, item)),
);

export const REINFORCED_SHIELD_RECIPE = STANDARD_NON_WEAPON_CRAFT_RECIPES.find(
  (recipe) => recipe.outputItemId === "item_shield_t3_reinforced",
);
if (REINFORCED_SHIELD_RECIPE === undefined) {
  throw new Error("Missing T3 reinforced shield recipe");
}

export const EQUIPMENT_CRAFT_RECIPES = [
  ...STANDARD_NON_WEAPON_CRAFT_RECIPES,
  ...STANDARD_WEAPON_CRAFT_RECIPES,
  BADON_TEMPORARY_RECIPE,
];
