import { describe, expect, it } from "vitest";
import {
  CLIENT_ABILITIES,
  resolvePrimaryAbilityId,
  resolveUnlockedWeaponAbilities,
  resolveWeaponAbilityUnlocks,
  resolveWeaponFamilyId,
  resolveWeaponMastery,
  resolveWeaponTier,
} from "./weaponContentCatalog.js";

const SPECIALIZATIONS = [
  "item_weapon_sword_t3_broadsword",
  "item_weapon_bow_t3_longbow",
  "item_weapon_bow_t4_badon",
  "item_weapon_staff_t3_infernal",
  "item_weapon_gloves_t3_spiked_gauntlets",
  "item_weapon_dagger_t3_pair",
] as const;

describe("weapon content catalog", () => {
  it("keeps authored weapon routing data-driven", () => {
    expect(resolveWeaponTier("item_weapon_sword_t4_broadsword")).toBe(4);
    expect(resolveWeaponFamilyId("item_weapon_bow_t4_badon")).toBe("bow");
    expect(resolveWeaponMastery("item_weapon_bow_t4_badon")).toEqual({
      familyId: "mastery_bow",
      weaponId: "mastery_badon",
    });
    expect(resolvePrimaryAbilityId("item_weapon_bow_t4_badon")).toBe("ability_bow_aimed_shot");
  });

  it("composes Q/W from family and E from specialization", () => {
    for (const itemId of SPECIALIZATIONS) {
      const unlocks = resolveWeaponAbilityUnlocks(itemId);
      expect(unlocks.map(({ unlockMasteryLevel }) => unlockMasteryLevel)).toEqual([1, 10, 30]);
      expect(unlocks.map(({ source }) => source)).toEqual(["family", "family", "specialization"]);
      expect(new Set(unlocks.map(({ ability }) => ability.id)).size).toBe(3);
    }
  });

  it("shares Arc Q/W between Longbow and Badon but keeps distinct M30 signatures", () => {
    const longbow = resolveWeaponAbilityUnlocks("item_weapon_bow_t4_longbow");
    const badon = resolveWeaponAbilityUnlocks("item_weapon_bow_t4_badon");
    expect(longbow.slice(0, 2).map(({ ability }) => ability.id)).toEqual([
      "ability_bow_aimed_shot",
      "ability_bow_piercing_arrow",
    ]);
    expect(badon.slice(0, 2).map(({ ability }) => ability.id)).toEqual(
      longbow.slice(0, 2).map(({ ability }) => ability.id),
    );
    expect(longbow[2]?.ability.id).toBe("ability_bow_deadeye");
    expect(badon[2]?.ability.id).toBe("ability_bow_badon_raging_storm");
  });

  it("unlocks slots at specialization mastery 1, 10 and 30", () => {
    for (const itemId of SPECIALIZATIONS) {
      expect(resolveUnlockedWeaponAbilities(itemId, 0)).toHaveLength(0);
      expect(resolveUnlockedWeaponAbilities(itemId, 1)).toHaveLength(1);
      expect(resolveUnlockedWeaponAbilities(itemId, 10)).toHaveLength(2);
      expect(resolveUnlockedWeaponAbilities(itemId, 30)).toHaveLength(3);
    }
  });

  it("authors conditional autocast without changing manual availability", () => {
    expect(CLIENT_ABILITIES.ability_sword_execution?.autoCast).toEqual({
      kind: "target_health_below",
      ratio: 0.3,
    });
  });

  it("keeps current M1 balance values", () => {
    expect(CLIENT_ABILITIES.ability_sword_heroic_strike).toMatchObject({ cooldown: 8, bonusDamageRatio: 0.75 });
    expect(CLIENT_ABILITIES.ability_bow_aimed_shot).toMatchObject({ cooldown: 5, bonusDamageRatio: 0.6 });
    expect(CLIENT_ABILITIES.ability_fire_fireball).toMatchObject({ cooldown: 5, bonusDamageRatio: 0.7 });
    expect(CLIENT_ABILITIES.ability_gloves_shockwave).toMatchObject({ cooldown: 6, bonusDamageRatio: 0.8 });
    expect(CLIENT_ABILITIES.ability_dagger_double_slash).toMatchObject({ cooldown: 4, bonusDamageRatio: 0.5 });
  });

  it("does not infer unknown weapons", () => {
    expect(resolveWeaponAbilityUnlocks("item_weapon_sword_t9_fake")).toEqual([]);
    expect(resolveWeaponFamilyId("item_weapon_sword_t9_fake")).toBeUndefined();
    expect(resolveWeaponTier("item_weapon_staff_t9_fake")).toBeUndefined();
  });
});
