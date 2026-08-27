import { describe, expect, it } from "vitest";
import {
  DUNGEON_COMPLETION_SILVER_BY_TIER,
  DUNGEON_ENCOUNTER_LOOT_BY_TIER,
  getDungeonArtifactFragmentItemId,
  getDungeonArtifactItemId,
  getFactionRuneItemId,
  type DungeonLootTier,
} from "@game/data";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { getDungeonLootDefinition } from "./dungeonLootContentCatalog.js";

describe("dungeonLootContentCatalog", () => {
  it("provides one dedicated tiered loot table for every authored faction dungeon", () => {
    for (const dungeon of DUNGEON_DEFINITIONS) {
      const loot = getDungeonLootDefinition(dungeon.lootTableId);
      const suffix = dungeon.faction.toLowerCase();
      const tier = dungeon.tier as DungeonLootTier;
      expect(loot.faction).toBe(dungeon.faction);
      expect(loot.tier).toBe(tier);
      expect(loot.artifactFragmentItemId).toBe(getDungeonArtifactFragmentItemId(suffix, tier));
      expect(loot.artifactItemId).toBe(getDungeonArtifactItemId(suffix, tier));
      expect(loot.enchantmentShardItemId).toBe(`item_resource_enchantment_shard_t${tier}`);
      expect(loot.factionRuneItemId).toBe(getFactionRuneItemId(tier));
      expect(loot.completionSilver).toBe(DUNGEON_COMPLETION_SILVER_BY_TIER[tier]);
      expect(loot.encounters).toBe(DUNGEON_ENCOUNTER_LOOT_BY_TIER[tier]);
    }
  });

  it("keeps artifact-fragment ranges identical across T4-T8", () => {
    const reference = DUNGEON_ENCOUNTER_LOOT_BY_TIER[4];
    for (const tier of [5, 6, 7, 8] as const) {
      expect(DUNGEON_ENCOUNTER_LOOT_BY_TIER[tier].normal.artifactFragmentRange).toEqual(reference.normal.artifactFragmentRange);
      expect(DUNGEON_ENCOUNTER_LOOT_BY_TIER[tier].elite.artifactFragmentRange).toEqual(reference.elite.artifactFragmentRange);
      expect(DUNGEON_ENCOUNTER_LOOT_BY_TIER[tier].boss.artifactFragmentRange).toEqual(reference.boss.artifactFragmentRange);
    }
    expect(reference.normal.artifactFragmentRange).toEqual({ min: 1, max: 5 });
    expect(reference.elite.artifactFragmentRange).toEqual({ min: 5, max: 12 });
    expect(reference.boss.artifactFragmentRange).toEqual({ min: 15, max: 30 });
  });

  it("locks the validated Silver, shard, Rune and artifact curves", () => {
    expect(DUNGEON_COMPLETION_SILVER_BY_TIER).toEqual({ 4: 10_000, 5: 20_000, 6: 35_000, 7: 55_000, 8: 80_000 });
    expect(DUNGEON_ENCOUNTER_LOOT_BY_TIER[4].elite.factionRuneRange).toEqual({ min: 0, max: 1 });
    expect(DUNGEON_ENCOUNTER_LOOT_BY_TIER[4].boss.factionRuneRange).toEqual({ min: 1, max: 3 });
    expect(DUNGEON_ENCOUNTER_LOOT_BY_TIER[8].elite.factionRuneRange).toEqual({ min: 0, max: 2 });
    expect(DUNGEON_ENCOUNTER_LOOT_BY_TIER[8].boss.factionRuneRange).toEqual({ min: 4, max: 7 });
    expect(DUNGEON_ENCOUNTER_LOOT_BY_TIER[4].boss.enchantmentShardRange).toEqual({ min: 2, max: 4 });
    expect(DUNGEON_ENCOUNTER_LOOT_BY_TIER[8].boss.enchantmentShardRange).toEqual({ min: 4, max: 8 });
    expect([4, 5, 6, 7, 8].map((tier) => DUNGEON_ENCOUNTER_LOOT_BY_TIER[tier as DungeonLootTier].boss.artifactDropChance)).toEqual([0.10, 0.12, 0.14, 0.16, 0.18]);
  });

  it("rejects unknown loot table ids", () => {
    expect(() => getDungeonLootDefinition("unknown")).toThrow(/Unknown dungeon loot table/);
  });
});
