import type { ProductionTier } from "../../../data/productionFamilyCatalog";
import type { CraftingRecipeVM, GameBridgeState } from "../../../game/GameBridge";
import { getFactionCapeDefinition } from "../../../data/factionCapeContentCatalog";
import { resolveEquipmentInfo } from "../../../data/itemContentCatalog";
import { resolveProgressionEquipmentRoute } from "../../../data/nonWeaponEquipmentContentCatalog";
import {
  getWeaponSpecializationName,
  resolveWeaponFamilyId,
} from "../../../data/weaponContentCatalog";
import { resolveWeaponFamilyCraftPresentation } from "../../../data/equipmentPresentation";

export type CraftingArmorFamilyId = "armor_head" | "armor_chest" | "armor_boots" | "armor_cape";
export type CraftingFamilyId = string;
export type CraftingCategoryId = "weapons" | "armors" | "other";

export interface CraftingRecipeModel extends CraftingRecipeVM {
  readonly selectionKey: string;
}

export interface CraftingFamilyModel {
  readonly id: CraftingFamilyId;
  readonly label: string;
  readonly symbol: string;
  readonly recipes: readonly CraftingRecipeModel[];
}

export interface CraftingCategoryModel {
  readonly id: CraftingCategoryId;
  readonly label: string;
  readonly families: readonly CraftingFamilyModel[];
}

export interface CraftingModel {
  readonly tier: ProductionTier;
  readonly categories: readonly CraftingCategoryModel[];
}

const NON_WEAPON_FAMILY_PRESENTATION: Readonly<Record<string, { readonly label: string; readonly symbol: string }>> = {
  offhand: { label: "Mains gauches", symbol: "◉" },
  other_key: { label: "Clé", symbol: "⚿" },
  other_artifact: { label: "Artefact", symbol: "✺" },
};

const ARMOR_FAMILY_PRESENTATION: Readonly<Record<CraftingArmorFamilyId, { readonly label: string; readonly symbol: string }>> = {
  armor_head: { label: "Tête", symbol: "♜" },
  armor_chest: { label: "Torse", symbol: "♜" },
  armor_boots: { label: "Pied", symbol: "♜" },
  armor_cape: { label: "Cape", symbol: "♜" },
};

const ARMOR_FAMILY_ORDER: readonly CraftingArmorFamilyId[] = [
  "armor_head",
  "armor_chest",
  "armor_boots",
  "armor_cape",
];

function resolveArmorFamilyId(recipe: CraftingRecipeVM): CraftingArmorFamilyId | undefined {
  switch (resolveEquipmentInfo(recipe.outputItemId)?.slot) {
    case "head": return "armor_head";
    case "chest": return "armor_chest";
    case "boots": return "armor_boots";
    case "cape": return "armor_cape";
    default: return undefined;
  }
}

function resolveCraftingFamilyPresentation(familyId: string) {
  return NON_WEAPON_FAMILY_PRESENTATION[familyId]
    ?? resolveWeaponFamilyCraftPresentation(familyId)
    ?? { label: familyId, symbol: "◆" };
}

/** Stable identity of one craft progression across T3-T8. */
export function resolveCraftingSelectionKey(recipe: CraftingRecipeVM): string {
  const weaponFamilyId = resolveWeaponFamilyId(recipe.outputItemId);
  const weaponSpecializationName = getWeaponSpecializationName(recipe.outputItemId);
  if (weaponFamilyId !== undefined && weaponSpecializationName !== undefined) {
    return `weapon:${weaponFamilyId}:${weaponSpecializationName}`;
  }

  const progressionRoute = resolveProgressionEquipmentRoute(recipe.outputItemId);
  if (progressionRoute !== undefined) {
    return `equipment:${progressionRoute.family.familyId}`;
  }

  const cape = getFactionCapeDefinition(recipe.outputItemId);
  if (cape !== undefined) {
    return `cape:${cape.factionId}`;
  }

  // Utility conversions are filtered by selected tier, so their authored item
  // identity remains sufficient and avoids introducing a parallel progression map.
  return `item:${recipe.outputItemId}`;
}

function toRecipeModel(recipe: CraftingRecipeVM): CraftingRecipeModel {
  return { ...recipe, selectionKey: resolveCraftingSelectionKey(recipe) };
}

function buildFirstOccurrenceOrder(values: readonly string[]): ReadonlyMap<string, number> {
  const order = new Map<string, number>();
  for (const value of values) {
    if (!order.has(value)) order.set(value, order.size);
  }
  return order;
}

interface CraftingSource {
  readonly tier: ProductionTier;
  readonly recipes: readonly CraftingRecipeVM[];
}

export function selectCraftingSource(state: GameBridgeState): CraftingSource {
  return { tier: state.crafting.productionTier, recipes: state.crafting.recipes };
}

export function buildCraftingModel(source: CraftingSource): CraftingModel {
  const recipesForTier = source.recipes.filter((recipe) => recipe.tier === source.tier);
  const canonicalFamilyOrder = buildFirstOccurrenceOrder(source.recipes.map((recipe) => recipe.family));
  const canonicalRecipeOrder = buildFirstOccurrenceOrder(source.recipes.map(resolveCraftingSelectionKey));
  const categories: readonly { readonly id: CraftingCategoryId; readonly label: string }[] = [
    { id: "weapons", label: "Armes" },
    { id: "armors", label: "Armures" },
    { id: "other", label: "Autre" },
  ];

  return {
    tier: source.tier,
    categories: categories
      .map((category) => {
        const categoryRecipes = recipesForTier.filter((recipe) => {
          if (category.id === "other") return recipe.family.startsWith("other_");
          const armorFamilyId = resolveArmorFamilyId(recipe);
          if (category.id === "armors") return armorFamilyId !== undefined;
          return armorFamilyId === undefined && !recipe.family.startsWith("other_");
        });
        const familyIds: readonly CraftingFamilyId[] = category.id === "armors"
          ? ARMOR_FAMILY_ORDER.filter((id) =>
              categoryRecipes.some((recipe) => resolveArmorFamilyId(recipe) === id),
            )
          : [...new Set(categoryRecipes.map((recipe) => recipe.family))].sort(
              (left, right) => (canonicalFamilyOrder.get(left) ?? Number.MAX_SAFE_INTEGER)
                - (canonicalFamilyOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
            );
        return {
          ...category,
          families: familyIds.map((id) => {
            const isArmorFamily = id.startsWith("armor_");
            const recipes = categoryRecipes
              .filter((recipe) =>
                isArmorFamily
                  ? resolveArmorFamilyId(recipe) === id
                  : recipe.family === id,
              )
              .map(toRecipeModel)
              .sort(
                (left, right) => (canonicalRecipeOrder.get(left.selectionKey) ?? Number.MAX_SAFE_INTEGER)
                  - (canonicalRecipeOrder.get(right.selectionKey) ?? Number.MAX_SAFE_INTEGER),
              );
            return {
              id,
              ...(isArmorFamily
                ? ARMOR_FAMILY_PRESENTATION[id as CraftingArmorFamilyId]
                : resolveCraftingFamilyPresentation(id)),
              recipes,
            };
          }),
        };
      })
      .filter((category) => category.families.length > 0),
  };
}
