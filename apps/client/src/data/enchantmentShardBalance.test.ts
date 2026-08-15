import { describe, expect, it } from "vitest";
import { getEnemyCombatProfile } from "@game/gameplay";
import { runBlueRuntimeBenchmark } from "../runtime/BlueRuntimeBenchmarkHarness.js";
import { getEnchantmentShardExpectedDrop } from "./economyContentCatalog";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { getWorldZonePlacement, WORLD_ZONE_IDS } from "./worldContentCatalog";

const T4_STANDARD = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;
const T4_ARMOR = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
  "item_traveler_cape",
] as const;
const T4_SHIELD = "item_shield_t4_reinforced";

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...T4_ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(T4_SHIELD);
  return items;
}

function projectRuntimeShardRate(
  zoneDefId: (typeof WORLD_ZONE_IDS)[keyof typeof WORLD_ZONE_IDS],
  segmentIndex: number,
): number {
  const placement = getWorldZonePlacement(zoneDefId);
  const combatRows = T4_STANDARD.map((weaponItemId) => runBlueRuntimeBenchmark({
    label: `shard_rate_${String(zoneDefId)}_${segmentIndex}`,
    weaponItemId,
    zoneDefId,
    segmentIndex,
    equipmentItemIds: equipmentFor(weaponItemId),
    enchantment: 2,
    masteryLevel: 20,
    useHealthPotions: false,
  }));
  const clears = combatRows.filter((row) => row.clear);
  // A farming-rate target is only meaningful when the benchmark package can
  // actually clear the segment with a majority of the authored weapon set.
  if (clears.length < Math.ceil(T4_STANDARD.length / 2)) return 0;

  const baselineHp = getEnemyCombatProfile(0, 0, 0, "blue").hp;
  let expectedShardsPerSegment = 0;
  for (let encounterIndex = 0; encounterIndex < 5; encounterIndex += 1) {
    const enemy = getEnemyCombatProfile(
      placement.zoneIndexWithinBand,
      segmentIndex,
      encounterIndex,
      "blue",
    );
    const isSpecial = encounterIndex === 4;
    expectedShardsPerSegment += getEnchantmentShardExpectedDrop({
      segmentIndex,
      isElite: isSpecial && segmentIndex < 9,
      isBoss: isSpecial && segmentIndex === 9,
      enchantmentDropWeight: baselineHp <= 0 ? 1 : enemy.hp / baselineHp,
    });
  }

  const secondsPerSegment = median(clears.map((row) => row.seconds)) + 5;
  return expectedShardsPerSegment * (3600 / Math.max(1, secondsPerSegment));
}

describe("T4 enchantment shard economy", () => {
  it("keeps deep same-tier T4 farming near the validated 25-30 shards/hour target", () => {
    const steppeDeep = projectRuntimeShardRate(WORLD_ZONE_IDS.steppe, 9);
    const mountainDeep = projectRuntimeShardRate(WORLD_ZONE_IDS.mountain, 9);

    expect(steppeDeep).toBeGreaterThanOrEqual(25);
    expect(steppeDeep).toBeLessThanOrEqual(31);
    expect(mountainDeep).toBeGreaterThanOrEqual(25);
    expect(mountainDeep).toBeLessThanOrEqual(31);
  });

  it("does not make the first T4 segment the optimal expected shard farm", () => {
    for (const zoneDefId of [WORLD_ZONE_IDS.steppe, WORLD_ZONE_IDS.mountain]) {
      const early = projectRuntimeShardRate(zoneDefId, 0);
      const mid = projectRuntimeShardRate(zoneDefId, 4);
      const deep = projectRuntimeShardRate(zoneDefId, 9);

      expect(mid).toBeGreaterThan(early);
      expect(deep).toBeGreaterThan(mid);
    }
  });
});
