import { describe, expect, it } from "vitest";
import {
  CLIENT_ABILITIES,
  WEAPON_FAMILIES,
  WEAPON_MASTERY_DEFINITIONS,
  getWeaponFamilyDisplayName,
  resolvePrimaryAbilityId,
  resolveWeaponAttackSpeed,
  resolveWeaponCombatProfile,
  resolveWeaponFamilyId,
  resolveWeaponMastery,
  resolveWeaponTier,
} from "./weaponContentCatalog.js";

const EXPECTED_WEAPONS = [
  { itemId: "item_weapon_sword_t3_broadsword", tier: 3, family: "sword", profile: "sword", attackSpeed: 1.2, familyId: "mastery_sword", specializationId: "mastery_broadsword", abilityId: "ability_sword_heroic_strike" },
  { itemId: "item_weapon_sword_t4_broadsword", tier: 4, family: "sword", profile: "sword", attackSpeed: 1.2, familyId: "mastery_sword", specializationId: "mastery_broadsword", abilityId: "ability_sword_heroic_strike" },
  { itemId: "item_weapon_bow_t3_longbow", tier: 3, family: "bow", profile: "bow", attackSpeed: 1, familyId: "mastery_bow", specializationId: "mastery_longbow", abilityId: "ability_bow_aimed_shot" },
  { itemId: "item_weapon_bow_t4_longbow", tier: 4, family: "bow", profile: "bow", attackSpeed: 1, familyId: "mastery_bow", specializationId: "mastery_longbow", abilityId: "ability_bow_aimed_shot" },
  { itemId: "item_weapon_bow_t4_badon", tier: 4, family: "bow", profile: "bow", attackSpeed: 1, familyId: "mastery_bow", specializationId: "mastery_badon", abilityId: "ability_bow_aimed_shot" },
  { itemId: "item_weapon_staff_t3_infernal", tier: 3, family: "fire_staff", profile: "staff", attackSpeed: 0.9, familyId: "mastery_fire_staff", specializationId: "mastery_infernal_staff", abilityId: "ability_fire_fireball" },
  { itemId: "item_weapon_staff_t4_infernal", tier: 4, family: "fire_staff", profile: "staff", attackSpeed: 0.9, familyId: "mastery_fire_staff", specializationId: "mastery_infernal_staff", abilityId: "ability_fire_fireball" },
  { itemId: "item_weapon_gloves_t3_spiked_gauntlets", tier: 3, family: "gloves", profile: "gloves", attackSpeed: 1.4, familyId: "mastery_gloves", specializationId: "mastery_spiked_gauntlets", abilityId: "ability_gloves_shockwave" },
  { itemId: "item_weapon_gloves_t4_spiked_gauntlets", tier: 4, family: "gloves", profile: "gloves", attackSpeed: 1.4, familyId: "mastery_gloves", specializationId: "mastery_spiked_gauntlets", abilityId: "ability_gloves_shockwave" },
  { itemId: "item_weapon_dagger_t3_pair", tier: 3, family: "dagger", profile: "dagger", attackSpeed: 1.6, familyId: "mastery_dagger", specializationId: "mastery_dagger_pair", abilityId: "ability_dagger_double_slash" },
  { itemId: "item_weapon_dagger_t4_pair", tier: 4, family: "dagger", profile: "dagger", attackSpeed: 1.6, familyId: "mastery_dagger", specializationId: "mastery_dagger_pair", abilityId: "ability_dagger_double_slash" },
] as const;

describe("weapon content catalog", () => {
  it("is the source of truth for family, tier, combat profile, speed, mastery and primary ability", () => {
    for (const expected of EXPECTED_WEAPONS) {
      expect(resolveWeaponTier(expected.itemId)).toBe(expected.tier);
      expect(resolveWeaponFamilyId(expected.itemId)).toBe(expected.family);
      expect(resolveWeaponCombatProfile(expected.itemId)).toBe(expected.profile);
      expect(resolveWeaponAttackSpeed(expected.itemId)).toBe(expected.attackSpeed);
      expect(resolveWeaponMastery(expected.itemId)).toEqual({ familyId: expected.familyId, weaponId: expected.specializationId });
      expect(resolvePrimaryAbilityId(expected.itemId)).toBe(expected.abilityId);
      expect(CLIENT_ABILITIES[expected.abilityId]).toBeDefined();
    }
  });

  it("authors each weapon family once", () => {
    expect(WEAPON_FAMILIES.sword).toEqual({ masteryId: "mastery_sword", name: "Épées" });
    expect(WEAPON_FAMILIES.bow).toEqual({ masteryId: "mastery_bow", name: "Arcs" });
    expect(WEAPON_FAMILIES.dagger).toEqual({ masteryId: "mastery_dagger", name: "Dagues" });
    expect(getWeaponFamilyDisplayName("fire_staff")).toBe("Bâtons de feu");
    expect(getWeaponFamilyDisplayName("gloves")).toBe("Gants");
    expect(getWeaponFamilyDisplayName("dagger")).toBe("Dagues");
  });

  it("derives family and specialization mastery categories without hardcoded mastery names", () => {
    const categories = new Map(WEAPON_MASTERY_DEFINITIONS.map((definition) => [definition.id, definition.category]));
    for (const id of ["mastery_sword", "mastery_bow", "mastery_fire_staff", "mastery_gloves", "mastery_dagger"]) {
      expect(categories.get(id)).toBe("weapon");
    }
    for (const id of ["mastery_broadsword", "mastery_longbow", "mastery_badon", "mastery_infernal_staff", "mastery_spiked_gauntlets", "mastery_dagger_pair"]) {
      expect(categories.get(id)).toBe("weapon_specialization");
    }
  });

  it("locks Dagger Pair gameplay balance", () => {
    expect(CLIENT_ABILITIES.ability_dagger_double_slash).toMatchObject({
      name: "Double entaille",
      cooldown: 4,
      damageType: "physical",
      bonusDamageRatio: 0.5,
    });
  });

  it("does not infer unknown weapons from item-id naming conventions", () => {
    expect(resolvePrimaryAbilityId("item_weapon_sword_t9_fake")).toBeUndefined();
    expect(resolveWeaponFamilyId("item_weapon_sword_t9_fake")).toBeUndefined();
    expect(resolveWeaponMastery("item_weapon_bow_t9_fake")).toBeUndefined();
    expect(resolveWeaponTier("item_weapon_staff_t9_fake")).toBeUndefined();
  });
});
