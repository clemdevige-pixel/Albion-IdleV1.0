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
    for (const dungeon of DUNGEON_DEFINITIONS) {
      const loot = getDungeonLootDefinition(dungeon.lootTableId);
      if (dungeon.tier === 4) {
        expect(loot.encounters.normal).toEqual({ artifactFragmentQuantity: 4, artifactDropChance: 0 });
        expect(loot.encounters.elite).toEqual({ artifactFragmentQuantity: 10, artifactDropChance: 0 });
        expect(loot.encounters.boss).toEqual({ artifactFragmentQuantity: 28, artifactDropChance: 0.1 });
      } else if (dungeon.tier === 5) {
        expect(loot.encounters.normal).toEqual({ artifactFragmentQuantity: 5, artifactDropChance: 0 });
        expect(loot.encounters.elite).toEqual({ artifactFragmentQuantity: 12, artifactDropChance: 0 });
        expect(loot.encounters.boss).toEqual({ artifactFragmentQuantity: 34, artifactDropChance: 0.12 });
      }
    }
  });

  it("rejects unknown loot table ids", () => {
    expect(() => getDungeonLootDefinition("unknown")).toThrow(/Unknown dungeon loot table/);
  });
});
