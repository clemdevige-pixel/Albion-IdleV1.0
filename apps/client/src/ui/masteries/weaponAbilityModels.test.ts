import { describe, expect, it } from "vitest";
import { getWeaponMasteryFamilyDefinitions } from "../../data/weaponContentCatalog";
import { getWeaponAbilityUnlocksForMastery } from "./weaponAbilityModels";

describe("weapon mastery ability presentation", () => {
  it("resolves the authored three-skill kit for every weapon specialization", () => {
    for (const family of getWeaponMasteryFamilyDefinitions()) {
      for (const specializationMasteryId of family.specializationMasteryIds) {
        const unlocks = getWeaponAbilityUnlocksForMastery(specializationMasteryId);
        expect(unlocks, specializationMasteryId).toHaveLength(3);
        expect(unlocks.map((entry) => entry.unlockMasteryLevel), specializationMasteryId).toEqual([1, 10, 30]);
        expect(new Set(unlocks.map((entry) => entry.ability.id)).size, specializationMasteryId).toBe(3);
      }
    }
  });

  it("returns no spells for a non-weapon mastery", () => {
    expect(getWeaponAbilityUnlocksForMastery("mastery_logging")).toEqual([]);
  });
});
