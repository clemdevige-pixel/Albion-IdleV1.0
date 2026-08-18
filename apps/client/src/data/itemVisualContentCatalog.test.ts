import { describe, expect, it } from "vitest";
import {
  GATHERING_CONTENT_TIERS,
  PRODUCTION_CONTENT_TIERS,
  PRODUCTION_FAMILY_IDS,
  getProductionFamilyDefinition,
} from "./productionFamilyCatalog.js";
import {
  PROGRESSION_EQUIPMENT_CONTENT,
} from "./nonWeaponEquipmentContentCatalog.js";
import { RESOURCE_TIER_CONTENT } from "./resourceContentCatalog.js";
import {
  PRODUCTION_RESOURCE_VISUALS,
  PROGRESSION_NON_WEAPON_VISUALS,
} from "./itemVisualContentCatalog.js";
import { getProductionRefiningRecipe } from "./refiningRecipes.js";

describe("item visual content catalog", () => {
  it("derives a visual for every authored progression equipment item", () => {
    for (const family of PROGRESSION_EQUIPMENT_CONTENT) {
      for (const item of family.items) {
        expect(PROGRESSION_NON_WEAPON_VISUALS[item.itemId]).toMatchObject({
          name: item.name,
          tier: item.tier,
          slot: family.slot,
          stats: item.stats,
        });
      }
    }
  });

  it("derives raw resource visuals for every authored gathering tier", () => {
    for (const familyId of PRODUCTION_FAMILY_IDS) {
      const family = getProductionFamilyDefinition(familyId);
      for (const tier of GATHERING_CONTENT_TIERS) {
        const presentation = family.tiers[tier];
        const resource = RESOURCE_TIER_CONTENT[familyId][tier];
        expect(presentation).toBeDefined();
        expect(resource).toBeDefined();
        expect(PRODUCTION_RESOURCE_VISUALS[resource.rawItemId]).toEqual({
          name: presentation?.resourceName,
          icon: family.rawIcon,
        });
      }
    }
  });

  it("derives refined resource visuals only for complete production tiers", () => {
    for (const familyId of PRODUCTION_FAMILY_IDS) {
      const family = getProductionFamilyDefinition(familyId);
      for (const tier of PRODUCTION_CONTENT_TIERS) {
        const recipe = getProductionRefiningRecipe(familyId, tier);
        expect(PRODUCTION_RESOURCE_VISUALS[recipe.outputItemId]).toEqual({
          name: recipe.name,
          icon: family.refinedIcon,
        });
      }
    }
  });
});
