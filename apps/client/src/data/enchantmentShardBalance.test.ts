import { describe, expect, it } from "vitest";
import { getEnemyCombatProfile } from "@game/gameplay";
import { benchmarkSyntheticIdealBlueSegment } from "./blueProgressionBenchmark";
import { getEnchantmentShardExpectedDrop } from "./economyContentCatalog";
import { getWorldZonePlacement, WORLD_ZONE_IDS } from "./worldContentCatalog";

const T4_STANDARD = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;

function projectSyntheticShardRate(
  zoneDefId: (typeof WORLD_ZONE_IDS)[keyof typeof WORLD_ZONE_IDS],
  segmentIndex: number,
): number {
  const placement = getWorldZonePlacement(zoneDefId);
  const combat = benchmarkSyntheticIdealBlueSegment({
    weaponItemIds: T4_STANDARD,
    masteryLevel: 20,
    enchantment: 2,
    zoneDefId,
    segmentIndex,
  });
  if (!combat.clear) return 0;

  const baselineHp = getEnemyCombatProfile(0, 0, 0, "blue").hp;
  let expectedShardsPerSegment = 0;
  for (const encounter of combat.encounters) {
    const enemy = getEnemyCombatProfile(
      placement.zoneIndexWithinBand,
      segmentIndex,
      encounter.encounterIndex,
      "blue",
    );
    const isSpecial = encounter.encounterIndex === 4;
    expectedShardsPerSegment += getEnchantmentShardExpectedDrop({
      segmentIndex,
      isElite: isSpecial && segmentIndex < 9,
      isBoss: isSpecial && segmentIndex === 9,
      enchantmentDropWeight: baselineHp <= 0 ? 1 : enemy.hp / baselineHp,
    });
  }

  // Keep the same ~1 second transition overhead used by projected runtime rates.
  const secondsPerSegment = combat.totalTimeSeconds + combat.encounters.length;
  return expectedShardsPerSegment * (3600 / Math.max(1, secondsPerSegment));
}

describe("T4 enchantment shard economy", () => {
  it("keeps deep same-tier T4 farming near the validated 25-30 shards/hour target", () => {
    const steppeDeep = projectSyntheticShardRate(WORLD_ZONE_IDS.steppe, 9);
    const mountainDeep = projectSyntheticShardRate(WORLD_ZONE_IDS.mountain, 9);

    expect(steppeDeep).toBeGreaterThanOrEqual(25);
    expect(steppeDeep).toBeLessThanOrEqual(31);
    expect(mountainDeep).toBeGreaterThanOrEqual(25);
    expect(mountainDeep).toBeLessThanOrEqual(31);
  });

  it("does not make the first T4 segment the optimal expected shard farm", () => {
    for (const zoneDefId of [WORLD_ZONE_IDS.steppe, WORLD_ZONE_IDS.mountain]) {
      const early = projectSyntheticShardRate(zoneDefId, 0);
      const mid = projectSyntheticShardRate(zoneDefId, 4);
      const deep = projectSyntheticShardRate(zoneDefId, 9);

      expect(mid).toBeGreaterThan(early);
      expect(deep).toBeGreaterThan(mid);
    }
  });
});
