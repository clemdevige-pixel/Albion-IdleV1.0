import {
  WEAPON_ITEM_DEFINITIONS,
  getWeaponSpecializationName,
  resolvePreviousWeaponTierItemId,
  resolveWeaponCraftRule,
  resolveWeaponFamilyId,
  resolveWeaponTier,
  type WeaponCraftMaterial,
} from "./weaponContentCatalog.js";
import type { ProductionFamilyId, ProductionTier } from "./productionFamilyCatalog.js";

export const BIRCH_PLANK_RECIPE = { id: "recipe_refine_birch_planks_t3", name: "Planches de bouleau", tier: 3, rawItemId: "item_resource_wood_t3", requirements: [{ itemId: "item_resource_wood_t3", quantity: 4 }], outputItemId: "item_refined_planks_t3", outputQuantity: 1, durationTicks: 6, stationId: "station_lumbermill_t3" } as const;
export const COPPER_BAR_RECIPE = { id: "recipe_refine_copper_bars_t3", name: "Lingots de cuivre", tier: 3, rawItemId: "item_resource_copper_ore_t3", requirements: [{ itemId: "item_resource_copper_ore_t3", quantity: 4 }], outputItemId: "item_refined_copper_bar_t3", outputQuantity: 1, durationTicks: 6, stationId: "station_smelter_t3" } as const;
export const PINE_PLANK_RECIPE = { id: "recipe_refine_pine_planks_t4", name: "Planches de pin", tier: 4, rawItemId: "item_resource_wood_t4", requirements: [{ itemId: "item_resource_wood_t4", quantity: 2 }, { itemId: "item_refined_planks_t3", quantity: 1 }], outputItemId: "item_refined_planks_t4", outputQuantity: 1, durationTicks: 8, stationId: "station_lumbermill_t4" } as const;
export const IRON_BAR_RECIPE = { id: "recipe_refine_iron_bars_t4", name: "Lingots de fer", tier: 4, rawItemId: "item_resource_ore_t4", requirements: [{ itemId: "item_resource_ore_t4", quantity: 2 }, { itemId: "item_refined_copper_bar_t3", quantity: 1 }], outputItemId: "item_refined_metal_bar_t4", outputQuantity: 1, durationTicks: 8, stationId: "station_smelter_t4" } as const;
export const STURDY_LEATHER_RECIPE = { id: "recipe_refine_sturdy_leather_t3", name: "Cuir robuste", tier: 3, rawItemId: "item_resource_hide_t3", requirements: [{ itemId: "item_resource_hide_t3", quantity: 4 }], outputItemId: "item_refined_leather_t3", outputQuantity: 1, durationTicks: 6, stationId: "station_tannery_t3" } as const;
export const LINEN_CLOTH_RECIPE = { id: "recipe_refine_linen_cloth_t3", name: "Tissu de lin", tier: 3, rawItemId: "item_resource_fiber_t3", requirements: [{ itemId: "item_resource_fiber_t3", quantity: 4 }], outputItemId: "item_refined_cloth_t3", outputQuantity: 1, durationTicks: 6, stationId: "station_loom_t3" } as const;
export const THICK_LEATHER_RECIPE = { id: "recipe_refine_thick_leather_t4", name: "Cuir épais", tier: 4, rawItemId: "item_resource_hide_t4", requirements: [{ itemId: "item_resource_hide_t4", quantity: 2 }, { itemId: "item_refined_leather_t3", quantity: 1 }], outputItemId: "item_refined_leather_t4", outputQuantity: 1, durationTicks: 8, stationId: "station_tannery_t4" } as const;
export const FINE_CLOTH_RECIPE = { id: "recipe_refine_fine_cloth_t4", name: "Tissu fin", tier: 4, rawItemId: "item_resource_fiber_t4", requirements: [{ itemId: "item_resource_fiber_t4", quantity: 2 }, { itemId: "item_refined_cloth_t3", quantity: 1 }], outputItemId: "item_refined_cloth_t4", outputQuantity: 1, durationTicks: 8, stationId: "station_loom_t4" } as const;

export const CEDAR_PLANK_RECIPE = { id: "recipe_refine_cedar_planks_t5", name: "Planches de cèdre", tier: 5, rawItemId: "item_resource_wood_t5", requirements: [{ itemId: "item_resource_wood_t5", quantity: 2 }, { itemId: "item_refined_planks_t4", quantity: 1 }], outputItemId: "item_refined_planks_t5", outputQuantity: 1, durationTicks: 10, stationId: "station_lumbermill_t5" } as const;
export const TITANIUM_BAR_RECIPE = { id: "recipe_refine_titanium_bars_t5", name: "Lingots de titane", tier: 5, rawItemId: "item_resource_ore_t5", requirements: [{ itemId: "item_resource_ore_t5", quantity: 2 }, { itemId: "item_refined_metal_bar_t4", quantity: 1 }], outputItemId: "item_refined_metal_bar_t5", outputQuantity: 1, durationTicks: 10, stationId: "station_smelter_t5" } as const;
export const HEAVY_LEATHER_RECIPE = { id: "recipe_refine_heavy_leather_t5", name: "Cuir lourd", tier: 5, rawItemId: "item_resource_hide_t5", requirements: [{ itemId: "item_resource_hide_t5", quantity: 2 }, { itemId: "item_refined_leather_t4", quantity: 1 }], outputItemId: "item_refined_leather_t5", outputQuantity: 1, durationTicks: 10, stationId: "station_tannery_t5" } as const;
export const ORNATE_CLOTH_RECIPE = { id: "recipe_refine_ornate_cloth_t5", name: "Tissu orné", tier: 5, rawItemId: "item_resource_fiber_t5", requirements: [{ itemId: "item_resource_fiber_t5", quantity: 2 }, { itemId: "item_refined_cloth_t4", quantity: 1 }], outputItemId: "item_refined_cloth_t5", outputQuantity: 1, durationTicks: 10, stationId: "station_loom_t5" } as const;

export interface ProductionRefiningRecipe {
  readonly id: string;
  readonly name: string;
  readonly tier: ProductionTier;
  readonly rawItemId: string;
  readonly requirements: readonly { readonly itemId: string; readonly quantity: number }[];
  readonly outputItemId: string;
  readonly outputQuantity: number;
  readonly durationTicks: number;
  readonly stationId: string;
}

const PRODUCTION_REFINING_RECIPES = {
  wood: {
    3: BIRCH_PLANK_RECIPE,
    4: PINE_PLANK_RECIPE,
    5: CEDAR_PLANK_RECIPE,
  },
  ore: {
    3: COPPER_BAR_RECIPE,
    4: IRON_BAR_RECIPE,
    5: TITANIUM_BAR_RECIPE,
  },
  hide: {
    3: STURDY_LEATHER_RECIPE,
    4: THICK_LEATHER_RECIPE,
    5: HEAVY_LEATHER_RECIPE,
  },
  fiber: {
    3: LINEN_CLOTH_RECIPE,
    4: FINE_CLOTH_RECIPE,
    5: ORNATE_CLOTH_RECIPE,
  },
} as const satisfies Record<
  ProductionFamilyId,
  Partial<Record<ProductionTier, ProductionRefiningRecipe>>
>;

export function getProductionRefiningRecipe(
  family: ProductionFamilyId,
  tier: ProductionTier,
): ProductionRefiningRecipe {
  const recipes = PRODUCTION_REFINING_RECIPES[family] as Readonly<
    Partial<Record<ProductionTier, ProductionRefiningRecipe>>
  >;

  const recipe = recipes[tier];

  if (recipe === undefined) {
    throw new Error(
      `Refining content missing for ${family} T${String(tier)}`,
    );
  }

  return recipe;
}

export function getWoodRecipe(
  tier: ProductionTier,
): ProductionRefiningRecipe {
  return getProductionRefiningRecipe("wood", tier);
}

export function getMetalRecipe(
  tier: ProductionTier,
): ProductionRefiningRecipe {
  return getProductionRefiningRecipe("ore", tier);
}

export function getLeatherRecipe(
  tier: ProductionTier,
): ProductionRefiningRecipe {
  return getProductionRefiningRecipe("hide", tier);
}

export function getClothRecipe(
  tier: ProductionTier,
): ProductionRefiningRecipe {
  return getProductionRefiningRecipe("fiber", tier);
}

const MATERIAL_ITEM_BY_KIND = {
  wood: (tier: ProductionTier) => getWoodRecipe(tier).outputItemId,
  metal: (tier: ProductionTier) => getMetalRecipe(tier).outputItemId,
  leather: (tier: ProductionTier) => getLeatherRecipe(tier).outputItemId,
  cloth: (tier: ProductionTier) => getClothRecipe(tier).outputItemId,
} as const;

function materialRequirement(material: WeaponCraftMaterial, tier: ProductionTier) {
  return { itemId: MATERIAL_ITEM_BY_KIND[material.kind](tier), quantity: material.quantity };
}

function createStandardWeaponRecipe(itemId: string) {
  const tier = resolveWeaponTier(itemId);
  const craft = resolveWeaponCraftRule(itemId);
  const family = resolveWeaponFamilyId(itemId);
  const name = getWeaponSpecializationName(itemId);
  if (tier === undefined || craft?.kind !== "standard" || family === undefined || name === undefined) return undefined;
  const requirements: Array<{ itemId: string; quantity: number }> = craft.materials.map((material) => materialRequirement(material, tier));
  const previousItemId = resolvePreviousWeaponTierItemId(itemId);
  if (tier >= 4) {
    if (previousItemId === undefined) throw new Error(`Standard weapon ${itemId} is missing its T${String(tier - 1)} predecessor.`);
    requirements.push({ itemId: previousItemId, quantity: 1 });
  }
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

export const REINFORCED_SHIELD_RECIPE = { id: "CRAFT_REINFORCED_SHIELD_T3_0", family: "offhand", name: "Bouclier renforcé T3", tier: 3, outputItemId: "item_shield_t3_reinforced", durationTicks: 0, requirements: [{ itemId: BIRCH_PLANK_RECIPE.outputItemId, quantity: 3 }, { itemId: COPPER_BAR_RECIPE.outputItemId, quantity: 2 }, { itemId: STURDY_LEATHER_RECIPE.outputItemId, quantity: 1 }] } as const;

// Badon is intentionally kept as an explicit temporary recipe until artifact crafting exists.
// It must not enter the standard predecessor generator.
export const BADON_TEMPORARY_RECIPE = {
  id: "CRAFT_BADON_T4_0", family: "bow", name: "Badon T4", tier: 4,
  outputItemId: "item_weapon_bow_t4_badon", durationTicks: 0,
  requirements: [
    { itemId: PINE_PLANK_RECIPE.outputItemId, quantity: 8 },
    { itemId: THICK_LEATHER_RECIPE.outputItemId, quantity: 4 },
    { itemId: FINE_CLOTH_RECIPE.outputItemId, quantity: 2 },
  ],
} as const;

const T5_NON_WEAPON_CRAFT_RECIPES = [
  {
    id: "CRAFT_REINFORCED_SHIELD_T5_0",
    name: "Bouclier renforcé T5",
    family: "offhand",
    tier: 5,
    outputItemId: "item_shield_t5_reinforced",
    durationTicks: 0,
    requirements: [
      { itemId: CEDAR_PLANK_RECIPE.outputItemId, quantity: 5 },
      { itemId: TITANIUM_BAR_RECIPE.outputItemId, quantity: 5 },
      { itemId: HEAVY_LEATHER_RECIPE.outputItemId, quantity: 3 },
      { itemId: "item_shield_t4_reinforced", quantity: 1 },
    ],
  },
  {
    id: "CRAFT_REINFORCED_HELMET_T5_0",
    name: "Casque renforcé T5",
    family: "armor",
    tier: 5,
    outputItemId: "item_helmet_t5_reinforced",
    durationTicks: 0,
    requirements: [
      { itemId: TITANIUM_BAR_RECIPE.outputItemId, quantity: 7 },
      { itemId: HEAVY_LEATHER_RECIPE.outputItemId, quantity: 3 },
      { itemId: "item_helmet_t4_reinforced", quantity: 1 },
    ],
  },
  {
    id: "CRAFT_LEATHER_ARMOR_T5_0",
    name: "Armure de cuir T5",
    family: "armor",
    tier: 5,
    outputItemId: "item_armor_t5_leather",
    durationTicks: 0,
    requirements: [
      { itemId: HEAVY_LEATHER_RECIPE.outputItemId, quantity: 7 },
      { itemId: ORNATE_CLOTH_RECIPE.outputItemId, quantity: 4 },
      { itemId: "item_armor_t4_leather", quantity: 1 },
    ],
  },
  {
    id: "CRAFT_LEATHER_BOOTS_T5_0",
    name: "Bottes de cuir T5",
    family: "armor",
    tier: 5,
    outputItemId: "item_boots_t5_leather",
    durationTicks: 0,
    requirements: [
      { itemId: HEAVY_LEATHER_RECIPE.outputItemId, quantity: 5 },
      { itemId: ORNATE_CLOTH_RECIPE.outputItemId, quantity: 3 },
      { itemId: "item_boots_t4_leather", quantity: 1 },
    ],
  },
] as const;

export const EQUIPMENT_CRAFT_RECIPES = [
  REINFORCED_SHIELD_RECIPE,
  { id: "CRAFT_REINFORCED_SHIELD_T4_0", name: "Bouclier renforcé T4", family: "offhand", tier: 4, outputItemId: "item_shield_t4_reinforced", durationTicks: 0, requirements: [{ itemId: PINE_PLANK_RECIPE.outputItemId, quantity: 4 }, { itemId: IRON_BAR_RECIPE.outputItemId, quantity: 4 }, { itemId: THICK_LEATHER_RECIPE.outputItemId, quantity: 2 }, { itemId: "item_shield_t3_reinforced", quantity: 1 }] },
  ...STANDARD_WEAPON_CRAFT_RECIPES,
  BADON_TEMPORARY_RECIPE,
  ...T5_NON_WEAPON_CRAFT_RECIPES,
  { id: "CRAFT_IRON_HELMET_T3_0", name: "Casque en fer T3", family: "armor", tier: 3, outputItemId: "item_iron_helmet", durationTicks: 0, requirements: [{ itemId: COPPER_BAR_RECIPE.outputItemId, quantity: 4 }, { itemId: STURDY_LEATHER_RECIPE.outputItemId, quantity: 1 }] },
  { id: "CRAFT_LEATHER_ARMOR_T3_0", name: "Armure de cuir T3", family: "armor", tier: 3, outputItemId: "item_leather_armor", durationTicks: 0, requirements: [{ itemId: STURDY_LEATHER_RECIPE.outputItemId, quantity: 4 }, { itemId: LINEN_CLOTH_RECIPE.outputItemId, quantity: 2 }] },
  { id: "CRAFT_LEATHER_BOOTS_T3_0", name: "Bottes de cuir T3", family: "armor", tier: 3, outputItemId: "item_leather_boots", durationTicks: 0, requirements: [{ itemId: STURDY_LEATHER_RECIPE.outputItemId, quantity: 3 }, { itemId: LINEN_CLOTH_RECIPE.outputItemId, quantity: 1 }] },
  { id: "CRAFT_REINFORCED_HELMET_T4_0", name: "Casque renforcé T4", family: "armor", tier: 4, outputItemId: "item_helmet_t4_reinforced", durationTicks: 0, requirements: [{ itemId: IRON_BAR_RECIPE.outputItemId, quantity: 6 }, { itemId: THICK_LEATHER_RECIPE.outputItemId, quantity: 2 }, { itemId: "item_iron_helmet", quantity: 1 }] },
  { id: "CRAFT_LEATHER_ARMOR_T4_0", name: "Armure de cuir T4", family: "armor", tier: 4, outputItemId: "item_armor_t4_leather", durationTicks: 0, requirements: [{ itemId: THICK_LEATHER_RECIPE.outputItemId, quantity: 6 }, { itemId: FINE_CLOTH_RECIPE.outputItemId, quantity: 3 }, { itemId: "item_leather_armor", quantity: 1 }] },
  { id: "CRAFT_LEATHER_BOOTS_T4_0", name: "Bottes de cuir T4", family: "armor", tier: 4, outputItemId: "item_boots_t4_leather", durationTicks: 0, requirements: [{ itemId: THICK_LEATHER_RECIPE.outputItemId, quantity: 4 }, { itemId: FINE_CLOTH_RECIPE.outputItemId, quantity: 2 }, { itemId: "item_leather_boots", quantity: 1 }] },
];
