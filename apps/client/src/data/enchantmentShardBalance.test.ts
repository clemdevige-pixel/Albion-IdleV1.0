import { describe, expect, it } from "vitest";
import { getEnemyCombatProfile } from "@game/gameplay";
import { getEnchantmentShardExpectedDrop } from "./economyContentCatalog";
import { getWorldZonePlacement, WORLD_ZONE_IDS } from "./worldContentCatalog";

function expectedShardsPerSegment(
  zoneDefId: (typeof WORLD_ZONE_IDS)[keyof typeof WORLD_ZONE_IDS],
  segmentIndex: number,
): number {
  const placement = getWorldZonePlacement(zoneDefId);
  const baselineHp = getEnemyCombatProfile(0, 0, 0, "blue").hp;
  let expected = 0;

  for (let encounterIndex = 0; encounterIndex < 5; encounterIndex += 1) {
    const enemy = getEnemyCombatProfile(
      placement.zoneIndexWithinBand,
      segmentIndex,
      encounterIndex,
      "blue",
    );
    const isSpecial = encounterIndex === 4;
    expected += getEnchantmentShardExpectedDrop({
      segmentIndex,
      isElite: isSpecial && segmentIndex < 9,
      isBoss: isSpecial && segmentIndex === 9,
      enchantmentDropWeight: baselineHp <= 0 ? 1 : enemy.hp / baselineHp,
    });
  }

  return expected;
}

describe("T4 enchantment shard economy", () => {
  it("keeps expected shard yield increasing with segment depth", () => {
    for (const zoneDefId of [WORLD_ZONE_IDS.steppe, WORLD_ZONE_IDS.mountain]) {
      const early = expectedShardsPerSegment(zoneDefId, 0);
      const mid = expectedShardsPerSegment(zoneDefId, 4);
      const deep = expectedShardsPerSegment(zoneDefId, 9);

      expect(mid).toBeGreaterThan(early);
      expect(deep).toBeGreaterThan(mid);
    }
  });

  it("keeps deep T4 zones strictly rewarding in expected shard yield", () => {
    const steppeDeep = expectedShardsPerSegment(WORLD_ZONE_IDS.steppe, 9);
    const mountainDeep = expectedShardsPerSegment(WORLD_ZONE_IDS.mountain, 9);

    expect(steppeDeep).toBeGreaterThan(0);
    expect(mountainDeep).toBeGreaterThan(steppeDeep);
  });
});
