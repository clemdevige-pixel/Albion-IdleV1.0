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

  it("shares the provisional T4 reward economy without duplicating runtime tuning", () => {
    for (const dungeon of DUNGEON_DEFINITIONS) {
      const loot = getDungeonLootDefinition(dungeon.lootTableId);
      expect(loot.encounters.normal).toEqual({ artifactFragmentQuantity: 4, artifactDropChance: 0 });
      expect(loot.encounters.elite).toEqual({ artifactFragmentQuantity: 10, artifactDropChance: 0 });
      expect(loot.encounters.boss).toEqual({ artifactFragmentQuantity: 28, artifactDropChance: 0.1 });
    }
  });

  it("rejects unknown loot table ids", () => {
    expect(() => getDungeonLootDefinition("unknown")).toThrow(/Unknown dungeon loot table/);
  });
});
