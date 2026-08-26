import { describe, expect, it } from "vitest";
import {
  DUNGEON_COMPLETION_FACTION_RUNES_BY_TIER,
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
      expect(loot.artifactFragmentItemId).toBe(
        getDungeonArtifactFragmentItemId(suffix, tier),
      );
      expect(loot.artifactItemId).toBe(getDungeonArtifactItemId(suffix, tier));
      expect(loot.enchantmentShardItemId).toBe(`item_resource_enchantment_shard_t${tier}`);
      expect(loot.factionRuneItemId).toBe(getFactionRuneItemId(tier));
      expect(loot.completionFactionRuneQuantity).toBe(
        DUNGEON_COMPLETION_FACTION_RUNES_BY_TIER[tier],
      );
    }
  });

  it("shares one reward profile per dungeon tier, including secondary shard bonuses", () => {
    const expected = {
      4: {
        normal: { artifactFragmentQuantity: 4, artifactDropChance: 0, enchantmentShardQuantity: 0 },
        elite: { artifactFragmentQuantity: 10, artifactDropChance: 0, enchantmentShardQuantity: 1 },
        boss: { artifactFragmentQuantity: 28, artifactDropChance: 0.1, enchantmentShardQuantity: 4 },
      },
      5: {
        normal: { artifactFragmentQuantity: 5, artifactDropChance: 0, enchantmentShardQuantity: 0 },
        elite: { artifactFragmentQuantity: 12, artifactDropChance: 0, enchantmentShardQuantity: 1 },
        boss: { artifactFragmentQuantity: 34, artifactDropChance: 0.12, enchantmentShardQuantity: 5 },
      },
      6: {
        normal: { artifactFragmentQuantity: 6, artifactDropChance: 0, enchantmentShardQuantity: 0 },
        elite: { artifactFragmentQuantity: 14, artifactDropChance: 0, enchantmentShardQuantity: 2 },
        boss: { artifactFragmentQuantity: 40, artifactDropChance: 0.14, enchantmentShardQuantity: 6 },
      },
      7: {
        normal: { artifactFragmentQuantity: 7, artifactDropChance: 0, enchantmentShardQuantity: 1 },
        elite: { artifactFragmentQuantity: 16, artifactDropChance: 0, enchantmentShardQuantity: 2 },
        boss: { artifactFragmentQuantity: 46, artifactDropChance: 0.16, enchantmentShardQuantity: 6 },
      },
      8: {
        normal: { artifactFragmentQuantity: 8, artifactDropChance: 0, enchantmentShardQuantity: 1 },
        elite: { artifactFragmentQuantity: 18, artifactDropChance: 0, enchantmentShardQuantity: 3 },
        boss: { artifactFragmentQuantity: 52, artifactDropChance: 0.18, enchantmentShardQuantity: 7 },
      },
    } as const;
    const expectedFullRunShards = { 4: 5, 5: 6, 6: 8, 7: 10, 8: 12 } as const;

    for (const dungeon of DUNGEON_DEFINITIONS) {
      const tier = dungeon.tier as keyof typeof expected;
      const profile = expected[tier];
      if (profile === undefined) throw new Error(`Unexpected authored dungeon tier: ${String(dungeon.tier)}`);
      const loot = getDungeonLootDefinition(dungeon.lootTableId);
      expect(loot.encounters).toEqual(profile);

      const shardTotal = dungeon.encounters.reduce(
        (sum, encounter) => sum + loot.encounters[encounter.kind].enchantmentShardQuantity,
        0,
      );
      expect(shardTotal).toBe(expectedFullRunShards[tier]);
    }
  });

  it("rejects unknown loot table ids", () => {
    expect(() => getDungeonLootDefinition("unknown")).toThrow(/Unknown dungeon loot table/);
  });
});
