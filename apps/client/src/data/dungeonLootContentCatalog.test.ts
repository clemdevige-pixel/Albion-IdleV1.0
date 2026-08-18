import { describe, expect, it } from "vitest";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { getDungeonLootDefinition } from "./dungeonLootContentCatalog.js";

describe("dungeonLootContentCatalog", () => {
  it("provides one dedicated loot table for every authored faction dungeon", () => {
    for (const dungeon of DUNGEON_DEFINITIONS) {
      const loot = getDungeonLootDefinition(dungeon.lootTableId);
      const suffix = dungeon.faction.toLowerCase();
      expect(loot.faction).toBe(dungeon.faction);
      expect(loot.artifactFragmentItemId).toBe(`item_resource_artifact_fragment_${suffix}`);
      expect(loot.artifactItemId).toBe(`item_resource_artifact_${suffix}`);
    }
  });

  it("shares one provisional reward profile per dungeon tier", () => {
    const expected = {
      4: { normal: { artifactFragmentQuantity: 4, artifactDropChance: 0 }, elite: { artifactFragmentQuantity: 10, artifactDropChance: 0 }, boss: { artifactFragmentQuantity: 28, artifactDropChance: 0.1 } },
      5: { normal: { artifactFragmentQuantity: 5, artifactDropChance: 0 }, elite: { artifactFragmentQuantity: 12, artifactDropChance: 0 }, boss: { artifactFragmentQuantity: 34, artifactDropChance: 0.12 } },
      6: { normal: { artifactFragmentQuantity: 6, artifactDropChance: 0 }, elite: { artifactFragmentQuantity: 14, artifactDropChance: 0 }, boss: { artifactFragmentQuantity: 40, artifactDropChance: 0.14 } },
      7: { normal: { artifactFragmentQuantity: 7, artifactDropChance: 0 }, elite: { artifactFragmentQuantity: 16, artifactDropChance: 0 }, boss: { artifactFragmentQuantity: 46, artifactDropChance: 0.16 } },
    } as const;
    for (const dungeon of DUNGEON_DEFINITIONS) {
      const profile = expected[dungeon.tier as keyof typeof expected];
      if (profile === undefined) throw new Error(`Unexpected authored dungeon tier: ${String(dungeon.tier)}`);
      expect(getDungeonLootDefinition(dungeon.lootTableId).encounters).toEqual(profile);
    }
  });

  it("rejects unknown loot table ids", () => {
    expect(() => getDungeonLootDefinition("unknown")).toThrow(/Unknown dungeon loot table/);
  });
});
