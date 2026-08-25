import { describe, expect, it } from "vitest";
import {
  DUNGEON_KEY_TIER_BY_WORLD_BAND,
  getDungeonKeyFragmentItemId,
  getDungeonKeyItemId,
  getDungeonKeyTierForWorldBand,
} from "@game/data";

describe("dungeonKeyContentCatalog", () => {
  it("routes every world band to its dungeon key tier", () => {
    expect(DUNGEON_KEY_TIER_BY_WORLD_BAND).toEqual({
      blue: 4,
      yellow: 5,
      orange: 6,
      red: 7,
      black: 8,
    });
    expect(getDungeonKeyTierForWorldBand("blue")).toBe(4);
    expect(getDungeonKeyTierForWorldBand("yellow")).toBe(5);
    expect(getDungeonKeyTierForWorldBand("orange")).toBe(6);
    expect(getDungeonKeyTierForWorldBand("red")).toBe(7);
    expect(getDungeonKeyTierForWorldBand("black")).toBe(8);
  });

  it("derives generic key and fragment item ids from tier", () => {
    for (const tier of [4, 5, 6, 7, 8] as const) {
      expect(getDungeonKeyFragmentItemId(tier)).toBe(`item_resource_dungeon_key_fragment_t${tier}`);
      expect(getDungeonKeyItemId(tier)).toBe(`item_resource_dungeon_key_t${tier}`);
    }
  });

  it("rejects unsupported dungeon key tiers instead of creating invalid resources", () => {
    expect(() => getDungeonKeyItemId(3)).toThrow(/Unsupported dungeon key tier/);
    expect(() => getDungeonKeyFragmentItemId(9)).toThrow(/Unsupported dungeon key tier/);
  });
});
