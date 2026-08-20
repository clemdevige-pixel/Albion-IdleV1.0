import { calculateResistanceMitigation } from "@game/gameplay";
import { describe, expect, it } from "vitest";
import { getWeaponDefensiveBenchmarkProfile, type BenchmarkDefensiveLoadout } from "./weaponIdealBenchmark.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type Enchantment = 0 | 3;

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
  return withShield
    ? { armorItemIds: armorIds(tier), offHandItemId: `item_shield_t${tier}_reinforced` }
    : { armorItemIds: armorIds(tier) };
}

const pct = (value: number): number => Number((value * 100).toFixed(1));
const round = (value: number): number => Number(value.toFixed(1));

describe("live defensive mitigation cross-tier audit", () => {
  it("measures real diminishing-return mitigation without imposing a synthetic cap", () => {
    const rows = ([4, 5, 6, 7, 8] as const).flatMap((tier) =>
      ([0, 3] as const).flatMap((enchantment) =>
        ([false, true] as const).map((withShield) => {
          const profile = getWeaponDefensiveBenchmarkProfile(
            weaponId(tier),
            enchantment,
            loadout(tier, withShield),
          );
          return {
            tier,
            enchantment,
            loadout: withShield ? "armor+shield" : "armor_only",
            maxHealth: round(profile.maxHealth),
            armor: round(profile.armor),
            physicalMitigationPct: pct(calculateResistanceMitigation(profile.armor)),
            magicResistance: round(profile.magicResistance),
            magicalMitigationPct: pct(calculateResistanceMitigation(profile.magicResistance)),
            averageEhp: round(profile.averageEffectiveHealth),
          };
        }),
      ),
    );

    console.log("[DEFENSIVE_MITIGATION_CROSS_TIER_AUDIT]");
    console.table(rows);
    console.log("[DEFENSIVE_MITIGATION_CROSS_TIER_AUDIT_JSON]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(20);
    expect(rows.every((row) => row.physicalMitigationPct < 100 && row.magicalMitigationPct < 100)).toBe(true);
  });
});
