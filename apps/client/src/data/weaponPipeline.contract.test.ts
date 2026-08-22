import { describe, expect, it } from "vitest";
import { buildMasteriesModel } from "../ui/masteries/masteryModels";
import {
  WEAPON_FAMILIES,
  WEAPON_MASTERY_DEFINITIONS,
  getWeaponMasteryFamilyDefinitions,
} from "./weaponContentCatalog";

const makeMasteryVm = (definition: (typeof WEAPON_MASTERY_DEFINITIONS)[number]) => ({
  id: definition.id,
  displayName: definition.id,
  category: definition.category,
  isUnlocked: true,
  level: 0,
  currentXp: 0,
  xpToNextLevel: 100,
  totalLifetimeXp: 0,
  maxLevel: definition.maxLevel,
});

describe("weapon pipeline contract", () => {
  it("keeps every declared weapon family internally coherent", () => {
    for (const definition of getWeaponMasteryFamilyDefinitions()) {
      expect(WEAPON_FAMILIES[definition.familyId]).toBeDefined();
      expect(definition.masteryId).toBe(WEAPON_FAMILIES[definition.familyId].masteryId);
      expect(definition.specializations.length).toBeGreaterThan(0);
      for (const specialization of definition.specializations) {
        expect(specialization.masteryId.length).toBeGreaterThan(0);
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
      workers: { capacity: 0, professionCapacity: 0, recruitmentCost: 0, workers: [] },
    });

    const combatById = new Map(model.categories.combat.map((family) => [family.id, family]));

    for (const definition of getWeaponMasteryFamilyDefinitions()) {
      const family = combatById.get(definition.masteryId);

      expect(family, `${definition.familyId}: Masteries family`).toBeDefined();
      expect(family?.name, `${definition.familyId}: family display name`).toBe(WEAPON_FAMILIES[definition.familyId].name);
      expect(family?.iconAsset, `${definition.familyId}: family icon asset`).toBeDefined();
      expect(family?.iconAsset?.length ?? 0, `${definition.familyId}: family icon asset path`).toBeGreaterThan(0);
      expect(
        family?.specializations.map((specialization) => specialization.id).sort(),
        `${definition.familyId}: specialization ids`,
      ).toEqual(definition.specializations.map((specialization) => specialization.masteryId).sort());
    }
  });
});
