import { describe, expect, it } from "vitest";
import { getWeaponAttackSpeed } from "./itemPower.js";
import { getWeaponAbilityMechanics } from "./weaponAbilityMechanics.js";

function firstDamageRatio(abilityId: string): number | undefined {
  const mechanic = getWeaponAbilityMechanics(abilityId)?.mechanics.find(({ kind }) => kind === "damage");
  return mechanic?.kind === "damage" ? mechanic.ratio : undefined;
}

describe("Blue weapon balance pass", () => {
  it("keeps attack-speed tuning authored by specialization rather than runtime mode", () => {
    expect(getWeaponAttackSpeed("item_weapon_sword_t4_broadsword")).toBeCloseTo(1.032);
    expect(getWeaponAttackSpeed("item_weapon_gloves_t4_spiked_gauntlets")).toBeCloseTo(1.148);
    expect(getWeaponAttackSpeed("item_weapon_dagger_t4_pair")).toBeCloseTo(1.392);
    expect(getWeaponAttackSpeed("item_weapon_bow_t4_longbow")).toBeCloseTo(1);
    expect(getWeaponAttackSpeed("item_weapon_staff_t4_infernal")).toBeCloseTo(0.9);
  });

  it("authors the refined active-progression pre-M30 Q/W ratios in mechanics data", () => {
    expect(firstDamageRatio("ability_sword_heroic_strike")).toBeCloseTo(0.75);
    expect(firstDamageRatio("ability_sword_guard_breaker")).toBeCloseTo(0.85);
    expect(firstDamageRatio("ability_bow_aimed_shot")).toBeCloseTo(0.534);
    expect(firstDamageRatio("ability_bow_piercing_arrow")).toBeCloseTo(0.712);
    expect(firstDamageRatio("ability_fire_fireball")).toBeCloseTo(0.36);
    expect(firstDamageRatio("ability_fire_infernal_burst")).toBeCloseTo(0.64);
    expect(firstDamageRatio("ability_gloves_shockwave")).toBeCloseTo(0.776);
    expect(firstDamageRatio("ability_gloves_breaking_combo")).toBeCloseTo(0.97);
    expect(firstDamageRatio("ability_dagger_double_slash")).toBeCloseTo(0.435);
    expect(firstDamageRatio("ability_dagger_flurry")).toBeCloseTo(0.696);
  });

  it("keeps Broadsword execution autocast conditional in authored data", () => {
    expect(getWeaponAbilityMechanics("ability_sword_execution")?.autoRule).toEqual({
      kind: "target_health_below",
      ratio: 0.3,
    });
  });

  it("does not retain the temporary AFK-motivated stun on Spiked W", () => {
    const stun = getWeaponAbilityMechanics("ability_gloves_breaking_combo")?.mechanics.find(
      (mechanic) => mechanic.kind === "status" && mechanic.effectType === "stun",
    );
    expect(stun).toBeUndefined();
  });

  it("does not change M30 signature damage mechanics", () => {
    expect(firstDamageRatio("ability_sword_execution")).toBeCloseTo(1.55);
    expect(firstDamageRatio("ability_bow_deadeye")).toBeCloseTo(1.95);
    expect(firstDamageRatio("ability_fire_cataclysm")).toBeCloseTo(1.2);
    expect(firstDamageRatio("ability_gloves_seismic_impact")).toBeCloseTo(1.4);
    expect(firstDamageRatio("ability_dagger_assassination")).toBeCloseTo(1.35);
  });
});
