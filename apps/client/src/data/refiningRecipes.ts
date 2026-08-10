import {
  WEAPON_ITEM_DEFINITIONS,
  getWeaponSpecializationName,
  resolvePreviousWeaponTierItemId,
  resolveWeaponCraftRule,
  resolveWeaponTier,
  type WeaponCraftMaterial,
} from "./weaponContentCatalog.js";

export const BIRCH_PLANK_RECIPE = { id: "recipe_refine_birch_planks_t3", name: "Planches de bouleau", tier: 3, rawItemId: "item_resource_wood_t3", requirements: [{ itemId: "item_resource_wood_t3", quantity: 4 }], outputItemId: "item_refined_planks_t3", outputQuantity: 1, durationTicks: 6, stationId: "station_lumbermill_t3" } as const;
export const COPPER_BAR_RECIPE = { id: "recipe_refine_copper_bars_t3", name: "Lingots de cuivre", tier: 3, rawItemId: "item_resource_copper_ore_t3", requirements: [{ itemId: "item_resource_copper_ore_t3", quantity: 4 }], outputItemId: "item_refined_copper_bar_t3", outputQuantity: 1, durationTicks: 6, stationId: "station_smelter_t3" } as const;
export const PINE_PLANK_RECIPE = { id: "recipe_refine_pine_planks_t4", name: "Planches de pin", tier: 4, rawItemId: "item_resource_wood_t4", requirements: [{ itemId: "item_resource_wood_t4", quantity: 2 }, { itemId: "item_refined_planks_t3", quantity: 1 }], outputItemId: "item_refined_planks_t4", outputQuantity: 1, durationTicks: 8, stationId: "station_lumbermill_t4" } as const;
export const IRON_BAR_RECIPE = { id: "recipe_refine_iron_bars_t4", name: "Lingots de fer", tier: 4, rawItemId: "item_resource_ore_t4", requirements: [{ itemId: "item_resource_ore_t4", quantity: 2 }, { itemId: "item_refined_copper_bar_t3", quantity: 1 }], outputItemId: "item_refined_metal_bar_t4", outputQuantity: 1, durationTicks: 8, stationId: "station_smelter_t4" } as const;
export const STURDY_LEATHER_RECIPE = { id: "recipe_refine_sturdy_leather_t3", name: "Cuir robuste", tier: 3, rawItemId: "item_resource_hide_t3", requirements: [{ itemId: "item_resource_hide_t3", quantity: 4 }], outputItemId: "item_refined_leather_t3", outputQuantity: 1, durationTicks: 6, stationId: "station_tannery_t3" } as const;
export const LINEN_CLOTH_RECIPE = { id: "recipe_refine_linen_cloth_t3", name: "Tissu de lin", tier: 3, rawItemId: "item_resource_fiber_t3", requirements: [{ itemId: "item_resource_fiber_t3", quantity: 4 }], outputItemId: "item_refined_cloth_t3", outputQuantity: 1, durationTicks: 6, stationId: "station_loom_t3" } as const;
export const THICK_LEATHER_RECIPE = { id: "recipe_refine_thick_leather_t4", name: "Cuir épais", tier: 4, rawItemId: "item_resource_hide_t4", requirements: [{ itemId: "item_resource_hide_t4", quantity: 2 }, { itemId: "item_refined_leather_t3", quantity: 1 }], outputItemId: "item_refined_leather_t4", outputQuantity: 1, durationTicks: 8, stationId: "station_tannery_t4" } as const;
export const FINE_CLOTH_RECIPE = { id: "recipe_refine_fine_cloth_t4", name: "Tissu fin", tier: 4, rawItemId: "item_resource_fiber_t4", requirements: [{ itemId: "item_resource_fiber_t4", quantity: 2 }, { itemId: "item_refined_cloth_t3", quantity: 1 }], outputItemId: "item_refined_cloth_t4", outputQuantity: 1, durationTicks: 8, stationId: "station_loom_t4" } as const;

export function getWoodRecipe(tier: 3 | 4) { return tier === 4 ? PINE_PLANK_RECIPE : BIRCH_PLANK_RECIPE; }
export function getMetalRecipe(tier: 3 | 4) { return tier === 4 ? IRON_BAR_RECIPE : COPPER_BAR_RECIPE; }
export function getLeatherRecipe(tier: 3 | 4) { return tier === 4 ? THICK_LEATHER_RECIPE : STURDY_LEATHER_RECIPE; }
export function getClothRecipe(tier: 3 | 4) { return tier === 4 ? FINE_CLOTH_RECIPE : LINEN_CLOTH_RECIPE; }

const MATERIAL_ITEM_BY_KIND = {
  wood: (tier: 3 | 4) => getWoodRecipe(tier).outputItemId,
  metal: (tier: 3 | 4) => getMetalRecipe(tier).outputItemId,
  leather: (tier: 3 | 4) => getLeatherRecipe(tier).outputItemId,
  cloth: (tier: 3 | 4) => getClothRecipe(tier).outputItemId,
} as const;

function materialRequirement(material: WeaponCraftMaterial, tier: 3 | 4) {
  return { itemId: MATERIAL_ITEM_BY_KIND[material.kind](tier), quantity: material.quantity };
}

function createStandardWeaponRecipe(itemId: string) {
  const tier = resolveWeaponTier(itemId);
  const craft = resolveWeaponCraftRule(itemId);
  const name = getWeaponSpecializationName(itemId);
  if (tier === undefined || craft?.kind !== "standard" || name === undefined) return undefined;
  const requirements = craft.materials.map((material) => materialRequirement(material, tier));
  const previousItemId = resolvePreviousWeaponTierItemId(itemId);
  if (tier >= 4) {
    if (previousItemId === undefined) throw new Error(`Standard weapon ${itemId} is missing its T${String(tier - 1)} predecessor.`);
    requirements.push({ itemId: previousItemId, quantity: 1 });
  }
  return {
    id: `CRAFT_${itemId.replace("item_weapon_", "").toUpperCase()}_0`,
    family: craft.family,
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

export const EQUIPMENT_CRAFT_RECIPES = [
  REINFORCED_SHIELD_RECIPE,
  { id: "CRAFT_REINFORCED_SHIELD_T4_0", name: "Bouclier renforcé T4", family: "offhand", tier: 4, outputItemId: "item_shield_t4_reinforced", durationTicks: 0, requirements: [{ itemId: PINE_PLANK_RECIPE.outputItemId, quantity: 4 }, { itemId: IRON_BAR_RECIPE.outputItemId, quantity: 4 }, { itemId: THICK_LEATHER_RECIPE.outputItemId, quantity: 2 }, { itemId: "item_shield_t3_reinforced", quantity: 1 }] },
  ...STANDARD_WEAPON_CRAFT_RECIPES,
  BADON_TEMPORARY_RECIPE,
  { id: "CRAFT_IRON_HELMET_T3_0", name: "Casque en fer T3", family: "armor", tier: 3, outputItemId: "item_iron_helmet", durationTicks: 0, requirements: [{ itemId: COPPER_BAR_RECIPE.outputItemId, quantity: 4 }, { itemId: STURDY_LEATHER_RECIPE.outputItemId, quantity: 1 }] },
  { id: "CRAFT_LEATHER_ARMOR_T3_0", name: "Armure de cuir T3", family: "armor", tier: 3, outputItemId: "item_leather_armor", durationTicks: 0, requirements: [{ itemId: STURDY_LEATHER_RECIPE.outputItemId, quantity: 4 }, { itemId: LINEN_CLOTH_RECIPE.outputItemId, quantity: 2 }] },
  { id: "CRAFT_LEATHER_BOOTS_T3_0", name: "Bottes de cuir T3", family: "armor", tier: 3, outputItemId: "item_leather_boots", durationTicks: 0, requirements: [{ itemId: STURDY_LEATHER_RECIPE.outputItemId, quantity: 3 }, { itemId: LINEN_CLOTH_RECIPE.outputItemId, quantity: 1 }] },
  { id: "CRAFT_REINFORCED_HELMET_T4_0", name: "Casque renforcé T4", family: "armor", tier: 4, outputItemId: "item_helmet_t4_reinforced", durationTicks: 0, requirements: [{ itemId: IRON_BAR_RECIPE.outputItemId, quantity: 6 }, { itemId: THICK_LEATHER_RECIPE.outputItemId, quantity: 2 }, { itemId: "item_iron_helmet", quantity: 1 }] },
  { id: "CRAFT_LEATHER_ARMOR_T4_0", name: "Armure de cuir T4", family: "armor", tier: 4, outputItemId: "item_armor_t4_leather", durationTicks: 0, requirements: [{ itemId: THICK_LEATHER_RECIPE.outputItemId, quantity: 6 }, { itemId: FINE_CLOTH_RECIPE.outputItemId, quantity: 3 }, { itemId: "item_leather_armor", quantity: 1 }] },
  { id: "CRAFT_LEATHER_BOOTS_T4_0", name: "Bottes de cuir T4", family: "armor", tier: 4, outputItemId: "item_boots_t4_leather", durationTicks: 0, requirements: [{ itemId: THICK_LEATHER_RECIPE.outputItemId, quantity: 4 }, { itemId: FINE_CLOTH_RECIPE.outputItemId, quantity: 2 }, { itemId: "item_leather_boots", quantity: 1 }] },
];
