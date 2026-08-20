import { describe, expect, it } from "vitest";
import {
  CLIENT_ABILITIES,
  resolvePrimaryAbilityId,
  resolveUnlockedWeaponAbilities,
  resolveWeaponAbilityUnlocks,
  resolveWeaponAttackSpeed,
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
    expect(resolveWeaponTier("item_weapon_sword_t8_broadsword")).toBe(8);
    expect(resolveWeaponTier("item_weapon_bow_t8_longbow")).toBe(8);
    expect(resolveWeaponTier("item_weapon_staff_t8_infernal")).toBe(8);
    expect(resolveWeaponTier("item_weapon_gloves_t8_spiked_gauntlets")).toBe(8);
    expect(resolveWeaponTier("item_weapon_dagger_t8_pair")).toBe(8);
    expect(resolveWeaponFamilyId("item_weapon_bow_t4_badon")).toBe("bow");
    expect(resolveWeaponMastery("item_weapon_bow_t4_badon")).toEqual({
      familyId: "mastery_bow",
      weaponId: "mastery_badon",
    });
    expect(resolvePrimaryAbilityId("item_weapon_bow_t4_badon")).toBe("ability_bow_aimed_shot");
  });

  it("authors final attack cadence on each specialization without a second balance layer", () => {
    expect(resolveWeaponAttackSpeed("item_weapon_sword_t4_broadsword")).toBeCloseTo(1.296);
    expect(resolveWeaponAttackSpeed("item_weapon_bow_t4_longbow")).toBe(1);
    expect(resolveWeaponAttackSpeed("item_weapon_bow_t4_badon")).toBe(1);
    expect(resolveWeaponAttackSpeed("item_weapon_staff_t4_infernal")).toBe(0.9);
    expect(resolveWeaponAttackSpeed("item_weapon_gloves_t4_spiked_gauntlets")).toBeCloseTo(1.204);
    expect(resolveWeaponAttackSpeed("item_weapon_dagger_t4_pair")).toBeCloseTo(1.392);
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

  it("authors conditional autocast on the authoritative ability mechanics", () => {
    expect(CLIENT_ABILITIES["ability_sword_execution"]?.mechanics.autoRule).toEqual({
      kind: "target_health_below",
      ratio: 0.5,
    });
  });

  it("keeps current live M1 mechanics", () => {
    expect(CLIENT_ABILITIES["ability_sword_heroic_strike"]).toMatchObject({
      cooldown: 6,
      mechanics: { mechanics: [{ kind: "damage", ratio: 0.9 }] },
    });
    expect(CLIENT_ABILITIES["ability_bow_aimed_shot"]).toMatchObject({
      cooldown: 5,
      mechanics: { mechanics: [{ kind: "damage", ratio: 0.534 }] },
    });
    expect(CLIENT_ABILITIES["ability_fire_fireball"]).toMatchObject({
      cooldown: 5,
      mechanics: {
        mechanics: [
          { kind: "damage", ratio: 0.36 },
          { kind: "dot", effectId: "effect_fire_burn", ratio: 0.064, interval: 1, ticks: 3 },
        ],
      },
    });
    expect(CLIENT_ABILITIES["ability_gloves_shockwave"]).toMatchObject({
      cooldown: 6,
      mechanics: { mechanics: [{ kind: "damage", ratio: 1.18 }] },
    });
    expect(CLIENT_ABILITIES["ability_dagger_double_slash"]).toMatchObject({
      cooldown: 4,
      mechanics: {
        mechanics: [
          { kind: "damage", ratio: 0.45, hits: 2 },
          { kind: "heal_from_damage", ratio: 0.12, maxHealthRatio: 0.015 },
        ],
      },
    });
  });

  it("does not infer unknown weapons", () => {
    expect(resolveWeaponAbilityUnlocks("item_weapon_sword_t9_fake")).toEqual([]);
    expect(resolveWeaponFamilyId("item_weapon_sword_t9_fake")).toBeUndefined();
    expect(resolveWeaponTier("item_weapon_staff_t9_fake")).toBeUndefined();
  });
});