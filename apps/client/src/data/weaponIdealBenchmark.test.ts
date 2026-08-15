import { describe, expect, it } from "vitest";
import {
  WEAPON_BALANCE_MASTERY_CHECKPOINTS,
  getSyntheticIdealCombatProfile,
  getSyntheticIdealWeaponProfile,
  getWeaponBenchmarkProfile,
  getWeaponCombatBenchmarkProfile,
  getWeaponDefensiveBenchmarkProfile,
} from "./weaponIdealBenchmark";

const T3_STARTERS = [
  "item_weapon_sword_t3_broadsword",
  "item_weapon_bow_t3_longbow",
  "item_weapon_staff_t3_infernal",
  "item_weapon_gloves_t3_spiked_gauntlets",
  "item_weapon_dagger_t3_pair",
] as const;

const T4_STANDARD = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;

describe("synthetic ideal weapon benchmark", () => {
  it("uses the real mastery unlock ladder 1 / 10 / 30", () => {
    for (const itemId of T3_STARTERS) {
      expect(getWeaponBenchmarkProfile(itemId, 1).unlockedAbilityCount).toBe(1);
      expect(getWeaponBenchmarkProfile(itemId, 9).unlockedAbilityCount).toBe(1);
      expect(getWeaponBenchmarkProfile(itemId, 10).unlockedAbilityCount).toBe(2);
      expect(getWeaponBenchmarkProfile(itemId, 29).unlockedAbilityCount).toBe(2);
      expect(getWeaponBenchmarkProfile(itemId, 30).unlockedAbilityCount).toBe(3);
      expect(getWeaponBenchmarkProfile(itemId, 50).unlockedAbilityCount).toBe(3);
    }
  });

  it("builds the offensive reference from all starters instead of selecting one live weapon", () => {
    for (const masteryLevel of WEAPON_BALANCE_MASTERY_CHECKPOINTS) {
      const profiles = T3_STARTERS.map((itemId) =>
        getWeaponBenchmarkProfile(itemId, masteryLevel, 0),
      );
      const ideal = getSyntheticIdealWeaponProfile(profiles, masteryLevel);
      const outputs = profiles.map((profile) => profile.sustainedDps).sort((a, b) => a - b);
      const opener5 = profiles.map((profile) => profile.openerDps5s).sort((a, b) => a - b);
      const opener10 = profiles.map((profile) => profile.openerDps10s).sort((a, b) => a - b);

      expect(ideal.sustainedDps).toBe(outputs[2]);
      expect(ideal.openerDps5s).toBe(opener5[2]);
      expect(ideal.openerDps10s).toBe(opener10[2]);
      expect(ideal.lowerBound).toBeCloseTo(ideal.sustainedDps * 0.9, 8);
      expect(ideal.upperBound).toBeCloseTo(ideal.sustainedDps * 1.1, 8);
    }
  });

  it("models segment-start cooldown reset as real opener pressure", () => {
    for (const itemId of T4_STANDARD) {
      const profile = getWeaponBenchmarkProfile(itemId, 20, 2);
      expect(profile.openerDps5s).toBeGreaterThan(profile.autoAttackDps);
      expect(profile.openerDps10s).toBeGreaterThan(profile.autoAttackDps);
    }
  });

  it("does not pretend a target-health execute is available against a fresh target", () => {
    const beforeSignature = getWeaponBenchmarkProfile("item_weapon_sword_t4_broadsword", 29, 2);
    const withSignature = getWeaponBenchmarkProfile("item_weapon_sword_t4_broadsword", 30, 2);

    // M30 gains Exécution for sustained combat, but the <30% HP rule means it
    // is not counted as an immediate segment opener against a fresh target.
    expect(withSignature.sustainedDps).toBeGreaterThan(beforeSignature.sustainedDps);
    expect(withSignature.openerDps5s / beforeSignature.openerDps5s).toBeLessThan(1.01);
  });

  it("allows an effect-gated signature to participate once its prerequisite is unlocked", () => {
    const beforeSignature = getWeaponBenchmarkProfile("item_weapon_dagger_t4_pair", 29, 2);
    const withSignature = getWeaponBenchmarkProfile("item_weapon_dagger_t4_pair", 30, 2);

    expect(withSignature.openerDps5s).toBeGreaterThan(beforeSignature.openerDps5s * 1.15);
  });

  it("matches the live full-T3 2H defensive character sheet", () => {
    const profile = getWeaponDefensiveBenchmarkProfile("item_weapon_gloves_t3_spiked_gauntlets", 0);
    expect(profile.maxHealth).toBe(580);
    expect(profile.armor).toBe(25);
    expect(profile.magicResistance).toBe(20);
  });

  it("keeps enchantment as a multiplicative T4 equipment upgrade in the benchmark", () => {
    for (const itemId of T4_STANDARD) {
      const base = getWeaponBenchmarkProfile(itemId, 30, 0);
      const plusTwo = getWeaponBenchmarkProfile(itemId, 30, 2);
      expect(plusTwo.sustainedDps / base.sustainedDps).toBeCloseTo(1.2, 8);
      expect(plusTwo.openerDps5s / base.openerDps5s).toBeCloseTo(1.2, 8);
      expect(plusTwo.openerDps10s / base.openerDps10s).toBeCloseTo(1.2, 8);
    }
  });

  it("captures the 1H shield survivability tradeoff separately from offense", () => {
    const sword = getWeaponDefensiveBenchmarkProfile("item_weapon_sword_t4_broadsword", 2);
    const bow = getWeaponDefensiveBenchmarkProfile("item_weapon_bow_t4_longbow", 2);

    expect(sword.offHandItemId).toBe("item_shield_t4_reinforced");
    expect(bow.offHandItemId).toBeUndefined();
    expect(sword.maxHealth).toBe(bow.maxHealth);
    expect(sword.armor).toBeGreaterThan(bow.armor);
    expect(sword.magicResistance).toBeGreaterThan(bow.magicResistance);
    expect(sword.physicalEffectiveHealth).toBeGreaterThan(bow.physicalEffectiveHealth);
    expect(sword.magicalEffectiveHealth).toBeGreaterThan(bow.magicalEffectiveHealth);
  });

  it("scales the T4 defensive envelope with enchantment without enchanting the retained T3 cape", () => {
    const base = getWeaponDefensiveBenchmarkProfile("item_weapon_bow_t4_longbow", 0);
    const plusTwo = getWeaponDefensiveBenchmarkProfile("item_weapon_bow_t4_longbow", 2);

    expect(plusTwo.maxHealth).toBeGreaterThan(base.maxHealth);
    expect(plusTwo.armor).toBeGreaterThan(base.armor);
    expect(plusTwo.magicResistance).toBeGreaterThan(base.magicResistance);
    expect(plusTwo.averageEffectiveHealth).toBeGreaterThan(base.averageEffectiveHealth);
  });

  it("builds a neutral combat ideal from median offense and median defense", () => {
    const profiles = T4_STANDARD.map((itemId) =>
      getWeaponCombatBenchmarkProfile(itemId, 20, 2),
    );
    const ideal = getSyntheticIdealCombatProfile(profiles, 20);
    const offensiveOutputs = profiles
      .map((profile) => profile.offense.sustainedDps)
      .sort((a, b) => a - b);
    const opener5 = profiles
      .map((profile) => profile.offense.openerDps5s)
      .sort((a, b) => a - b);
    const physicalEhp = profiles
      .map((profile) => profile.defense.physicalEffectiveHealth)
      .sort((a, b) => a - b);

    expect(ideal.sustainedDps).toBe(offensiveOutputs[2]);
    expect(ideal.openerDps5s).toBe(opener5[2]);
    expect(ideal.physicalEffectiveHealth).toBe(physicalEhp[2]);
    expect(ideal.averageEffectiveHealth).toBeGreaterThan(0);
  });
});
