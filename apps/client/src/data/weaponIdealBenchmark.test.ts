import { describe, expect, it } from "vitest";
import {
  WEAPON_BALANCE_MASTERY_CHECKPOINTS,
  getSyntheticIdealWeaponProfile,
  getWeaponBenchmarkProfile,
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
      expect(getWeaponBenchmarkProfile(itemId, 10).unlockedAbilityCount).toBe(2);
      expect(getWeaponBenchmarkProfile(itemId, 30).unlockedAbilityCount).toBe(3);
      expect(getWeaponBenchmarkProfile(itemId, 50).unlockedAbilityCount).toBe(3);
    }
  });

  it("builds the reference from all starters instead of selecting one live weapon", () => {
    for (const masteryLevel of WEAPON_BALANCE_MASTERY_CHECKPOINTS) {
      const profiles = T3_STARTERS.map((itemId) =>
        getWeaponBenchmarkProfile(itemId, masteryLevel, 0),
      );
      const ideal = getSyntheticIdealWeaponProfile(profiles, masteryLevel);
      const outputs = profiles.map((profile) => profile.sustainedDps).sort((a, b) => a - b);

      expect(ideal.sustainedDps).toBe(outputs[2]);
      expect(ideal.lowerBound).toBeCloseTo(ideal.sustainedDps * 0.9, 8);
      expect(ideal.upperBound).toBeCloseTo(ideal.sustainedDps * 1.1, 8);
    }
  });

  it("keeps enchantment as a multiplicative equipment upgrade in the benchmark", () => {
    for (const itemId of T4_STANDARD) {
      const base = getWeaponBenchmarkProfile(itemId, 30, 0);
      const plusTwo = getWeaponBenchmarkProfile(itemId, 30, 2);
      expect(plusTwo.sustainedDps / base.sustainedDps).toBeCloseTo(1.2, 8);
    }
  });

  it("captures the authored 1H versus 2H offensive tradeoff instead of hiding it", () => {
    const sword = getWeaponBenchmarkProfile("item_weapon_sword_t4_broadsword", 10, 2);
    const bow = getWeaponBenchmarkProfile("item_weapon_bow_t4_longbow", 10, 2);

    expect(sword.handling).toBe("one_handed");
    expect(bow.handling).toBe("two_handed");
    expect(bow.sustainedDps).toBeGreaterThan(sword.sustainedDps);
  });
});
