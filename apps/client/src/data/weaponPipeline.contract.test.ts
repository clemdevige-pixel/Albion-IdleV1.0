import { describe, expect, it } from "vitest";
import {
  CLIENT_ABILITIES,
  WEAPON_FAMILIES,
  WEAPON_ITEM_DEFINITIONS,
  WEAPON_MASTERY_DEFINITIONS,
  WEAPON_VENDOR_OFFERS,
  getWeaponMasteryDisplayName,
  getWeaponMasteryFamilyDefinitions,
  resolvePrimaryAbilityId,
  resolvePreviousWeaponTierItemId,
  resolveWeaponAttackSpeed,
  resolveWeaponCombatProfile,
  resolveWeaponCraftRule,
  resolveWeaponFamilyId,
  resolveWeaponMastery,
  resolveWeaponTier,
} from "./weaponContentCatalog.js";
import {
  EQUIPMENT_CRAFT_RECIPES,
  STANDARD_WEAPON_CRAFT_RECIPES,
} from "./refiningRecipes.js";
import {
  resolveEnchantmentItemInfo,
  resolveEquipmentInfo,
  resolveRepairableInfo,
} from "./itemContentCatalog.js";
import { getItemPower } from "./itemPower.js";
import {
  resolveEquipmentPresentation,
  resolveWeaponFamilyCraftPresentation,
} from "./equipmentPresentation.js";
import { buildMasteriesModel } from "../ui/masteries/masteryModels.js";

const WEAPON_ITEM_IDS = Object.keys(WEAPON_ITEM_DEFINITIONS);

function makeMasteryVm(definition: (typeof WEAPON_MASTERY_DEFINITIONS)[number]) {
  return {
    id: definition.id,
    displayName: getWeaponMasteryDisplayName(definition.id) ?? definition.id,
    category: definition.category,
    isUnlocked: true,
    level: 1,
    currentXp: 0,
    xpToNextLevel: definition.experiencePerLevel[0] ?? 0,
    totalLifetimeXp: 0,
    maxLevel: definition.maxLevel,
  };
}

describe("weapon pipeline contract", () => {
  it("keeps every declared weapon connected to all generic runtime/content boundaries", () => {
    expect(WEAPON_ITEM_IDS.length).toBeGreaterThan(0);

    for (const itemId of WEAPON_ITEM_IDS) {
      const tier = resolveWeaponTier(itemId);
      const equipment = resolveEquipmentInfo(itemId);
      const mastery = resolveWeaponMastery(itemId);
      const familyId = resolveWeaponFamilyId(itemId);
      const abilityId = resolvePrimaryAbilityId(itemId);
      const presentation = resolveEquipmentPresentation(itemId);
      const craftRule = resolveWeaponCraftRule(itemId);
      const recipes = EQUIPMENT_CRAFT_RECIPES.filter((recipe) => recipe.outputItemId === itemId);
      const vendorOffers = WEAPON_VENDOR_OFFERS.filter((offer) => offer.itemId === itemId);
      const repairable = resolveRepairableInfo(itemId);
      const enchantment = resolveEnchantmentItemInfo(itemId);

      expect(tier, `${itemId}: tier`).toBeDefined();
      expect(getItemPower(itemId), `${itemId}: item power`).toBeDefined();

      expect(equipment, `${itemId}: equipment`).toBeDefined();
      expect(equipment?.slot, `${itemId}: weapon slot`).toBe("weapon");

      expect(familyId, `${itemId}: family`).toBeDefined();
      expect(familyId === undefined ? undefined : WEAPON_FAMILIES[familyId], `${itemId}: family definition`).toBeDefined();
      expect(mastery, `${itemId}: mastery route`).toBeDefined();
      expect(
        WEAPON_MASTERY_DEFINITIONS.some((definition) => definition.id === mastery?.familyId),
        `${itemId}: family mastery definition`,
      ).toBe(true);
      expect(
        WEAPON_MASTERY_DEFINITIONS.some((definition) => definition.id === mastery?.weaponId),
        `${itemId}: specialization mastery definition`,
      ).toBe(true);

      expect(resolveWeaponCombatProfile(itemId), `${itemId}: combat profile`).toBeDefined();
      expect(resolveWeaponAttackSpeed(itemId), `${itemId}: attack speed`).toBeGreaterThan(0);
      expect(abilityId, `${itemId}: primary ability route`).toBeDefined();
      expect(abilityId === undefined ? undefined : CLIENT_ABILITIES[abilityId], `${itemId}: primary ability definition`).toBeDefined();

      expect(vendorOffers, `${itemId}: vendor offer count`).toHaveLength(1);
      expect(recipes, `${itemId}: craft recipe count`).toHaveLength(1);
      expect(craftRule, `${itemId}: craft rule`).toBeDefined();

      expect(presentation, `${itemId}: equipment presentation`).toBeDefined();
      expect(presentation?.itemIcon.length ?? 0, `${itemId}: item icon`).toBeGreaterThan(0);
      expect(presentation?.actorManifestId.length ?? 0, `${itemId}: actor manifest`).toBeGreaterThan(0);
      expect(presentation?.combatProfileId.length ?? 0, `${itemId}: presentation combat profile`).toBeGreaterThan(0);

      expect(repairable?.equipmentCategory, `${itemId}: repair recognition`).toBe("weapon");
      expect(repairable?.itemTier, `${itemId}: repair tier`).toBe(tier);

      expect(enchantment?.itemTier, `${itemId}: enchantment tier`).toBe(tier);
      if (tier === 3) {
        expect(enchantment?.enchantable, `${itemId}: T3 must not be enchantable`).toBe(false);
      } else if (tier === 4) {
        expect(enchantment?.enchantable, `${itemId}: T4 must be enchantable`).toBe(true);
      }

      if (craftRule?.kind === "standard") {
        expect(
          STANDARD_WEAPON_CRAFT_RECIPES.some((recipe) => recipe.outputItemId === itemId),
          `${itemId}: standard generator membership`,
        ).toBe(true);

        const weaponRequirements = recipes[0]?.requirements.filter((requirement) =>
          requirement.itemId.startsWith("item_weapon_"),
        ) ?? [];

        if (tier === 3) {
          expect(weaponRequirements, `${itemId}: T3 predecessor requirements`).toHaveLength(0);
        } else if (tier === 4) {
          const predecessor = resolvePreviousWeaponTierItemId(itemId);
          expect(predecessor, `${itemId}: T4 predecessor route`).toBeDefined();
          expect(weaponRequirements, `${itemId}: T4 predecessor requirement count`).toEqual([
            { itemId: predecessor, quantity: 1 },
          ]);
        }
      } else if (craftRule?.kind === "artifact_pending") {
        expect(
          STANDARD_WEAPON_CRAFT_RECIPES.some((recipe) => recipe.outputItemId === itemId),
          `${itemId}: artifact weapon must stay outside standard generator`,
        ).toBe(false);
      }
    }
  });

  it("keeps every weapon family and specialization representable in the Masteries UI model", () => {
    const model = buildMasteriesModel({
      progression: {
        totalFame: 0,
        overflowPool: 0,
        masteries: WEAPON_MASTERY_DEFINITIONS.map(makeMasteryVm),
      },
      workers: { capacity: 0, recruitmentCost: 0, workers: [] },
    } as never);

    const combatById = new Map(model.categories.combat.map((family) => [family.id, family]));

    for (const definition of getWeaponMasteryFamilyDefinitions()) {
      const family = combatById.get(definition.masteryId);
      const presentation = resolveWeaponFamilyCraftPresentation(definition.familyId);

      expect(family, `${definition.familyId}: Masteries family`).toBeDefined();
      expect(family?.name, `${definition.familyId}: family display name`).toBe(WEAPON_FAMILIES[definition.familyId].name);
      expect(presentation, `${definition.familyId}: family presentation`).toBeDefined();
      expect(family?.icon, `${definition.familyId}: family icon`).toBe(presentation?.symbol);
      expect(
        family?.specializations.map((specialization) => specialization.id).sort(),
        `${definition.familyId}: specialization topology`,
      ).toEqual([...definition.specializationMasteryIds].sort());
    }
  });
});
