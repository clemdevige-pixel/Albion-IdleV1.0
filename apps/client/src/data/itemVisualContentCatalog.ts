import { FACTION_CAPE_CONTENT } from "./factionCapeContentCatalog.js";
import {
  PROGRESSION_EQUIPMENT_CONTENT,
} from "./nonWeaponEquipmentContentCatalog.js";
import {
  GATHERING_CONTENT_TIERS,
  REFINING_CONTENT_TIERS,
  PRODUCTION_FAMILY_IDS,
  getProductionFamilyDefinition,
} from "./productionFamilyCatalog.js";
import { RESOURCE_TIER_CONTENT } from "./resourceContentCatalog.js";
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

const NON_WEAPON_ICON_BY_FAMILY: Readonly<Record<string, string>> = {
  reinforced_shield: "item-wooden-shield-pixel-v1.png",
  reinforced_helmet: "item-iron-helmet-pixel-v2.png",
  leather_armor: "item-leather-armor-pixel-v2.png",
  leather_boots: "item-leather-boots-pixel-v2.png",
};

const FACTION_CAPE_ICON_BY_FACTION: Readonly<Record<string, string>> = {
  keeper: "CAPE_KEEPER.png",
  heretic: "CAPE_HERETIC.png",
  undead: "CAPE_UNDEAD.png",
  morgana: "CAPE_MORGANA.png",
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

for (const cape of FACTION_CAPE_CONTENT) {
  const icon = FACTION_CAPE_ICON_BY_FACTION[cape.factionId];
  if (icon === undefined) {
    throw new Error(`Missing faction cape icon for: ${cape.factionId}`);
  }
  progressionNonWeaponVisualEntries.push([
    cape.itemId,
    {
      name: cape.name,
      icon,
      tier: cape.tier,
      slot: "cape",
      handling: "one_handed",
      stats: cape.stats,
    },
  ]);
}

export const PROGRESSION_NON_WEAPON_VISUALS: Readonly<
  Record<string, CatalogItemVisualDefinition>
> = Object.fromEntries(progressionNonWeaponVisualEntries);

const productionResourceVisualEntries: Array<readonly [string, CatalogResourceVisualDefinition]> = [];
for (const familyId of PRODUCTION_FAMILY_IDS) {
  const family = getProductionFamilyDefinition(familyId);

  for (const tier of GATHERING_CONTENT_TIERS) {
    const presentation = family.tiers[tier];
    const resource = RESOURCE_TIER_CONTENT[familyId][tier];
    if (presentation === undefined || resource === undefined) {
      throw new Error(`Missing gathering presentation for ${familyId} T${String(tier)}`);
    }
    productionResourceVisualEntries.push([
      resource.rawItemId,
      { name: presentation.resourceName, icon: family.rawIcon },
    ]);
  }

  for (const tier of REFINING_CONTENT_TIERS) {
    const recipe = getProductionRefiningRecipe(familyId, tier);
    productionResourceVisualEntries.push([
      recipe.outputItemId,
      { name: recipe.name, icon: family.refinedIcon },
    ]);
  }
}

export const PRODUCTION_RESOURCE_VISUALS: Readonly<
  Record<string, CatalogResourceVisualDefinition>
> = Object.fromEntries(productionResourceVisualEntries);
