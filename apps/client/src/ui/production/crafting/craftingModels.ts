import type { CraftingRecipeVM, GameBridgeState } from "../../../game/GameBridge";
import { resolveEquipmentInfo } from "../../../data/itemContentCatalog";

export type CraftingArmorFamilyId = "armor_head" | "armor_chest" | "armor_boots";
export type CraftingFamilyId = CraftingRecipeVM["family"] | CraftingArmorFamilyId;
export type CraftingCategoryId = "weapons" | "armors";

export interface CraftingFamilyModel {
  readonly id: CraftingFamilyId;
  readonly label: string;
  readonly symbol: string;
  readonly recipes: readonly CraftingRecipeVM[];
}

export interface CraftingCategoryModel {
  readonly id: CraftingCategoryId;
  readonly label: string;
  readonly families: readonly CraftingFamilyModel[];
}

export interface CraftingModel {
  readonly tier: 3 | 4;
  readonly categories: readonly CraftingCategoryModel[];
}

const FAMILY_PRESENTATION: Readonly<Record<CraftingRecipeVM["family"], { readonly label: string; readonly symbol: string }>> = {
  offhand: { label: "Mains gauches", symbol: "◉" },
  bow: { label: "Arcs", symbol: "➶" },
  sword: { label: "Épées", symbol: "⚔" },
  fire_staff: { label: "Bâtons de feu", symbol: "◆" },
  armor: { label: "Armures", symbol: "♜" },
  gloves: { label: "Gants", symbol: "✦" },
};

const ARMOR_FAMILY_PRESENTATION: Readonly<Record<CraftingArmorFamilyId, { readonly label: string; readonly symbol: string }>> = {
  armor_head: { label: "Tête", symbol: "♜" },
  armor_chest: { label: "Torse", symbol: "♜" },
  armor_boots: { label: "Pied", symbol: "♜" },
};

function resolveArmorFamilyId(recipe: CraftingRecipeVM): CraftingArmorFamilyId | undefined {
  switch (resolveEquipmentInfo(recipe.outputItemId)?.slot) {
    case "head": return "armor_head";
    case "chest": return "armor_chest";
    case "boots": return "armor_boots";
    default: return undefined;
  }
}

interface CraftingSource {
  readonly tier: 3 | 4;
  readonly recipes: readonly CraftingRecipeVM[];
}

export function selectCraftingSource(state: GameBridgeState): CraftingSource {
  return { tier: state.crafting.productionTier, recipes: state.crafting.recipes };
}

export function buildCraftingModel(source: CraftingSource): CraftingModel {
  const recipesForTier = source.recipes.filter((recipe) => recipe.tier === source.tier);
  const categories: readonly { readonly id: CraftingCategoryId; readonly label: string }[] = [
    { id: "weapons", label: "Armes" },
    { id: "armors", label: "Armures" },
  ];

  return {
    tier: source.tier,
    categories: categories
      .map((category) => {
        const categoryRecipes = recipesForTier.filter((recipe) =>
          category.id === "armors" ? recipe.family === "armor" : recipe.family !== "armor",
        );
        const familyIds: readonly CraftingFamilyId[] = category.id === "armors"
          ? (["armor_head", "armor_chest", "armor_boots"] as const).filter((id) =>
              categoryRecipes.some((recipe) => resolveArmorFamilyId(recipe) === id),
            )
          : [...new Set(categoryRecipes.map((recipe) => recipe.family))];
        return {
          ...category,
          families: familyIds.map((id) => {
            const isArmorFamily = id.startsWith("armor_");
            return {
              id,
              ...(isArmorFamily
                ? ARMOR_FAMILY_PRESENTATION[id as CraftingArmorFamilyId]
                : FAMILY_PRESENTATION[id as CraftingRecipeVM["family"]]),
              recipes: categoryRecipes.filter((recipe) =>
                isArmorFamily
                  ? resolveArmorFamilyId(recipe) === id
                  : recipe.family === id,
              ),
            };
          }),
        };
      })
      .filter((category) => category.families.length > 0),
  };
}
