import { describe, expect, it } from "vitest";
import { TOWER_TIERS, TOWER_TRIAL_BLOCKS } from "@game/data";
import { getTowerBlockDefinition, getTowerBlocks, getTowerFloorDefinition } from "./tower-generator.js";

describe("Tower block generator", () => {
  it("returns the authored trial sequence for floors 1-25 regardless of seed", () => {
    for (const block of TOWER_TRIAL_BLOCKS) {
      expect(getTowerBlockDefinition(block.blockIndex, "seed-a")).toMatchObject({ ...block, source: "trial" });
      expect(getTowerBlockDefinition(block.blockIndex, "seed-b")).toMatchObject({ ...block, source: "trial" });
    }
  });

  it("is deterministic for the same endless seed", () => {
    expect(getTowerBlocks(5, 20, "account-seed")).toEqual(getTowerBlocks(5, 20, "account-seed"));
  });

  it("consumes every tier exactly once per five endless blocks", () => {
    const blocks = getTowerBlocks(5, 25, "tier-bag-seed");
    for (let offset = 0; offset < blocks.length; offset += 5) {
      const bag = blocks.slice(offset, offset + 5).map((block) => block.tier).sort((a, b) => a - b);
      expect(bag).toEqual([...TOWER_TIERS]);
    }
  });

  it("never repeats a faction on adjacent blocks, including floor 25 to 26", () => {
    const blocks = [
      getTowerBlockDefinition(4, "faction-seed"),
      ...getTowerBlocks(5, 50, "faction-seed"),
    ];
    for (let index = 1; index < blocks.length; index += 1) {
      expect(blocks[index]?.factionId).not.toBe(blocks[index - 1]?.factionId);
    }
  });

  it("marks every 25th floor as a major boss", () => {
    expect(getTowerBlockDefinition(4, "boss-seed").majorBoss).toBe(true);
    expect(getTowerBlockDefinition(5, "boss-seed").majorBoss).toBe(false);
    expect(getTowerBlockDefinition(9, "boss-seed").majorBoss).toBe(true);
  });

  it("resolves the authored five-floor role cadence without changing block identity", () => {
    expect(getTowerFloorDefinition(1, "floor-seed")).toMatchObject({
      floor: 1,
      indexInBlock: 0,
      role: "normal",
      majorBoss: false,
      block: { blockIndex: 0, tier: 8, factionId: "keeper" },
    });
    expect(getTowerFloorDefinition(3, "floor-seed").role).toBe("reinforced");
    expect(getTowerFloorDefinition(4, "floor-seed").role).toBe("elite");
    expect(getTowerFloorDefinition(5, "floor-seed").role).toBe("block_boss");
    expect(getTowerFloorDefinition(25, "floor-seed")).toMatchObject({
      role: "block_boss",
      majorBoss: true,
      block: { blockIndex: 4, tier: 5, factionId: "morgana", majorBoss: true },
    });
    expect(getTowerFloorDefinition(26, "floor-seed")).toMatchObject({
      floor: 26,
      indexInBlock: 0,
      role: "normal",
      majorBoss: false,
      block: { blockIndex: 5, source: "endless" },
    });
  });

  it("rejects invalid floor numbers", () => {
    expect(() => getTowerFloorDefinition(0, "floor-seed")).toThrow();
    expect(() => getTowerFloorDefinition(1.5, "floor-seed")).toThrow();
  });
});
