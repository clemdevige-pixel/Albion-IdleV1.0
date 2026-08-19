import { describe, expect, it } from "vitest";
import {
  getWeaponBenchmarkProfile,
  getWeaponDefensiveBenchmarkProfile,
  type BenchmarkDefensiveLoadout,
} from "./weaponIdealBenchmark.js";

const TIERS = [4, 5, 6, 7, 8] as const;
type Tier = (typeof TIERS)[number];

const MASTERY_BY_TIER: Readonly<Record<Tier, number>> = {
  4: 22,
  5: 35,
  6: 45,
  7: 55,
  8: 65,
};

function weaponId(tier: Tier): string {
  return `item_weapon_sword_t${tier}_broadsword`;
}

function armorIds(tier: Tier): readonly string[] {
  return [
    `item_helmet_t${tier}_reinforced`,
    `item_armor_t${tier}_leather`,
    `item_boots_t${tier}_leather`,
    "item_traveler_cape",
  ];
}

function loadout(tier: Tier, withShield: boolean): BenchmarkDefensiveLoadout {
  return {
    armorItemIds: armorIds(tier),
    ...(withShield ? { offHandItemId: `item_shield_t${tier}_reinforced` } : {}),
  };
}

const round = (value: number, digits = 1): number => Number(value.toFixed(digits));

function cappedResistance(value: number): number {
  return Math.min(80, Math.max(0, value));
}

describe("Broadsword shield scaling diagnostic", () => {
  it("shows where shield defensive value is lost to resistance caps", () => {
    const rows = TIERS.map((tier) => {
      const mastery = MASTERY_BY_TIER[tier];
      const offense = getWeaponBenchmarkProfile(weaponId(tier), mastery, 3);
      const noShield = getWeaponDefensiveBenchmarkProfile(weaponId(tier), 3, loadout(tier, false));
      const withShield = getWeaponDefensiveBenchmarkProfile(weaponId(tier), 3, loadout(tier, true));

      const rawArmorGain = withShield.armor - noShield.armor;
      const rawMrGain = withShield.magicResistance - noShield.magicResistance;
      const effectiveArmorGain = cappedResistance(withShield.armor) - cappedResistance(noShield.armor);
      const effectiveMrGain = cappedResistance(withShield.magicResistance) - cappedResistance(noShield.magicResistance);
      const ehpGainPercent = ((withShield.averageEffectiveHealth / noShield.averageEffectiveHealth) - 1) * 100;

      return {
        tier,
        mastery,
        sustainedDps: round(offense.sustainedDps, 2),
        noShieldArmor: round(noShield.armor),
        shieldArmor: round(withShield.armor),
        rawArmorGain: round(rawArmorGain),
        effectiveArmorGain: round(effectiveArmorGain),
        noShieldMr: round(noShield.magicResistance),
        shieldMr: round(withShield.magicResistance),
        rawMrGain: round(rawMrGain),
        effectiveMrGain: round(effectiveMrGain),
        noShieldEhp: round(noShield.averageEffectiveHealth),
        shieldEhp: round(withShield.averageEffectiveHealth),
        ehpGainPercent: round(ehpGainPercent),
        armorCapReachedWithoutShield: noShield.armor >= 80,
        armorCapReachedWithShield: withShield.armor >= 80,
        mrCapReachedWithoutShield: noShield.magicResistance >= 80,
        mrCapReachedWithShield: withShield.magicResistance >= 80,
      };
    });

    console.log("[BROADSWORD_SHIELD_SCALING_DIAGNOSTIC]");
    console.table(rows);
    console.log("[BROADSWORD_SHIELD_SCALING_DIAGNOSTIC_JSON]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(TIERS.length);
    expect(rows.every((row) => row.rawArmorGain > 0 && row.rawMrGain > 0)).toBe(true);
  });
});
