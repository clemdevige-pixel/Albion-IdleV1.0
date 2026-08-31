import { describe, expect, it } from "vitest";
import { TOWER_TRIAL_BLOCK_COMBAT_MULTIPLIERS } from "@game/data";
import { resolveTowerEncounter } from "./towerEncounterResolver.js";

const TRIAL_FLOOR_BY_TIER = {
  8: 1,
  7: 6,
  6: 11,
  5: 21,
  4: 16,
} as const;

type TowerTier = keyof typeof TRIAL_FLOOR_BY_TIER;

function resolveTrialNormalAtBaseDepth(tier: TowerTier) {
  const floor = TRIAL_FLOOR_BY_TIER[tier];
  const encounter = resolveTowerEncounter(floor, "tower-tier-parity-benchmark");

  if (encounter.status !== "resolved") {
    throw new Error(`Tower encounter did not resolve for T${String(tier)} floor ${String(floor)}`);
  }

  return encounter;
}

describe("tower tier parity benchmark", () => {
  it("reports the authored base-depth normal profile for every Tower trial tier", () => {
    const rows = ([4, 5, 6, 7, 8] as const).map((tier) => {
      const encounter = resolveTrialNormalAtBaseDepth(tier);
      const block = encounter.floorDefinition.block;
      const trialCalibration = TOWER_TRIAL_BLOCK_COMBAT_MULTIPLIERS[block.id];

      return {
        tier,
        floor: encounter.floorDefinition.floor,
        faction: block.factionId,
        hp: encounter.combatProfile.hp,
        damage: encounter.combatProfile.damage,
        attackSpeed: encounter.combatProfile.attackSpeed,
        armor: encounter.combatProfile.armor,
        magicResistance: encounter.combatProfile.magicResistance,
        trialHpMultiplier: trialCalibration?.hp ?? 1,
        trialDamageMultiplier: trialCalibration?.damage ?? 1,
      };
    });

    console.table(rows);

    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.tier)).toEqual([4, 5, 6, 7, 8]);
    for (const row of rows) {
      expect(row.hp).toBeGreaterThan(0);
      expect(row.damage).toBeGreaterThan(0);
      expect(row.attackSpeed).toBeGreaterThan(0);
      expect(row.armor).toBeGreaterThanOrEqual(0);
      expect(row.magicResistance).toBeGreaterThanOrEqual(0);
    }
  });
});
