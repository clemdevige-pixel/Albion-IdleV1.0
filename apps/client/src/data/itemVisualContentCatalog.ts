import {
  PROGRESSION_EQUIPMENT_CONTENT,
} from "./nonWeaponEquipmentContentCatalog.js";
import {
  PRODUCTION_CONTENT_TIERS,
  PRODUCTION_FAMILY_IDS,
  getProductionFamilyDefinition,
} from "./productionFamilyCatalog.js";
import { getProductionRefiningRecipe } from "./refiningRecipes.js";

export interface CatalogItemVisualDefinition {
  readonly name: string;
  readonly icon: string;
  readonly tier: number;
  readonly slot: "head" | "chest" | "boots" | "weapon" | "off_hand" | "cape";
  readonly handling?: "one_handed" | "two_handed";
  readonly stats: Readonly<Record<string, number>>;
}

export interface CatalogResourceVisualDefinition {
  readonly name: string;
  readonly icon: string;
}

/**
 * Presentation shared by every tier of a conventional non-weapon family.
 * Adding a future tier to the equipment family must not require another
 * ItemVisual routing entry.
 */
const NON_WEAPON_ICON_BY_FAMILY: Readonly<Record<string, string>> = {
  reinforced_shield: "item-wooden-shield-pixel-v1.png",
  reinforced_helmet: "item-iron-helmet-pixel-v1.png",
  leather_armor: "item-leather-armor-pixel-v1.png",
  leather_boots: "item-leather-boots-pixel-v1.png",
};

const progressionNonWeaponVisualEntries: Array<readonly [string, CatalogItemVisualDefinition]> = [];
for (const family of PROGRESSION_EQUIPMENT_CONTENT) {
  const icon = NON_WEAPON_ICON_BY_FAMILY[family.familyId];
  if (icon === undefined) {
    throw new Error(`Missing item icon for progression equipment family: ${family.familyId}`);
  }
  for (const item of family.items) {
    progressionNonWeaponVisualEntries.push([
      item.itemId,
      {
        name: item.name,
        icon,
        tier: item.tier,
        slot: family.slot,
        ...(family.handling === "one_handed" || family.handling === "two_handed"
          ? { handling: family.handling }
          : {}),
        stats: item.stats,
      },
    ]);
  }
}

export const PROGRESSION_NON_WEAPON_VISUALS: Readonly<
  Record<string, CatalogItemVisualDefinition>
> = Object.fromEntries(progressionNonWeaponVisualEntries);

/**
 * Raw/refined resource presentation is projected from the production content
 * itself. T6+ resource visuals therefore arrive automatically when the tier is
 * added to PRODUCTION_CONTENT_TIERS and its family/refining data is authored.
 */
const productionResourceVisualEntries: Array<readonly [string, CatalogResourceVisualDefinition]> = [];
for (const familyId of PRODUCTION_FAMILY_IDS) {
  const family = getProductionFamilyDefinition(familyId);
  for (const tier of PRODUCTION_CONTENT_TIERS) {
    const presentation = family.tiers[tier];
    if (presentation === undefined) {
      throw new Error(`Missing production presentation for ${familyId} T${String(tier)}`);
    }
    const recipe = getProductionRefiningRecipe(familyId, tier);
    productionResourceVisualEntries.push(
      [
        recipe.rawItemId,
        { name: presentation.resourceName, icon: family.rawIcon },
      ],
      [
        recipe.outputItemId,
        { name: recipe.name, icon: family.refinedIcon },
      ],
    );
  }
}

export const PRODUCTION_RESOURCE_VISUALS: Readonly<
  Record<string, CatalogResourceVisualDefinition>
> = Object.fromEntries(productionResourceVisualEntries);
