import { describe, expect, it } from "vitest";
import {
  ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE,
  DEFAULT_DUNGEON_KEY_BAND_PROGRESSION,
  SEGMENT_LOOT_MULTIPLIERS,
  KEY_FRAGMENTS_PER_KEY,
  getAuthoredRepairCostTiers,
  getDungeonKeyProgressionWeight,
  getMissingRepairCostDefinitions,
  getSegmentLootMultiplier,
  getEnchantmentShardExpectedDrop,
  rollCombatDrops,
  type CombatLootContext,
} from "./economyContentCatalog";

const BASE_CONTEXT: CombatLootContext = {
  segmentIndex: 0,
  faction: "Morgana",
  isElite: false,
  isBoss: false,
  isFinalBoss: false,
  enchantmentTier: 4,
  enchantmentDropWeight: 1,
  dungeonKeyDropWeight: 1,
};

function sequenceRandom(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++] ?? 1;
}

describe("combat loot", () => {
  it("keeps the generic segment progression curve available for other loot families", () => {
    expect(SEGMENT_LOOT_MULTIPLIERS).toEqual([
      1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4, 1.5,
    ]);
    expect(getSegmentLootMultiplier(0)).toBe(1);
    expect(getSegmentLootMultiplier(9)).toBe(1.5);
  });

  it("keeps the approved fragment conversion targets", () => {
    expect(KEY_FRAGMENTS_PER_KEY).toBe(50);
    expect(ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE).toBe(200);
  });

  it("uses an independent progressive key curve inside every world band", () => {
    expect(DEFAULT_DUNGEON_KEY_BAND_PROGRESSION).toHaveLength(5);
    expect(getDungeonKeyProgressionWeight("blue", 0, 0)).toBe(0.45);
    expect(getDungeonKeyProgressionWeight("blue", 4, 9)).toBe(4);
    expect(getDungeonKeyProgressionWeight("yellow", 0, 0)).toBe(0.45);
    expect(getDungeonKeyProgressionWeight("yellow", 4, 9)).toBe(4);
    expect(getDungeonKeyProgressionWeight("orange", 0, 0)).toBe(0.45);
  });

  it("drops exactly the shard matching the current world tier", () => {
    const t4Drops = rollCombatDrops(BASE_CONTEXT, () => 0);
    const t5Drops = rollCombatDrops(
      { ...BASE_CONTEXT, enchantmentTier: 5 },
      () => 0,
    );

    expect(t4Drops.find((drop) => drop.kind === "enchantment")).toMatchObject({
      itemId: "item_resource_enchantment_shard_t4",
      quantity: 1,
    });
    expect(t5Drops.find((drop) => drop.kind === "enchantment")).toMatchObject({
      itemId: "item_resource_enchantment_shard_t5",
      quantity: 1,
    });
  });

  it("scales enchantment yield with enemy difficulty and zone depth", () => {
    const early = getEnchantmentShardExpectedDrop(BASE_CONTEXT);
    const deeperTougher = getEnchantmentShardExpectedDrop({
      ...BASE_CONTEXT,
      segmentIndex: 9,
      enchantmentDropWeight: 3,
    });
    const elite = getEnchantmentShardExpectedDrop({ ...BASE_CONTEXT, isElite: true });
    const boss = getEnchantmentShardExpectedDrop({ ...BASE_CONTEXT, isBoss: true });

    expect(deeperTougher).toBeGreaterThan(early * 3);
    expect(elite).toBeGreaterThan(early);
    expect(boss).toBeGreaterThan(elite);
  });

  it("keeps health potions out of combat loot", () => {
    const drops = rollCombatDrops(BASE_CONTEXT, () => 0);

    expect(drops.some((drop) => drop.itemId === "item_health_potion")).toBe(false);
    expect(drops.some((drop) => drop.kind === "consumable")).toBe(false);
  });

  it("allows independent regular drops on the same kill", () => {
    const drops = rollCombatDrops(BASE_CONTEXT, () => 0);

    expect(drops.map((drop) => drop.kind)).toEqual([
      "enchantment",
      "key_fragment",
      "key",
    ]);
  });

  it("uses authored band progression to improve dungeon key drop rate", () => {
    const rolls = [1, 0.025, 1] as const;
    const earlyDrops = rollCombatDrops(
      { ...BASE_CONTEXT, dungeonKeyDropWeight: 0.45 },
      sequenceRandom(rolls),
    );
    const lateDrops = rollCombatDrops(
      { ...BASE_CONTEXT, segmentIndex: 9, dungeonKeyDropWeight: 4 },
      sequenceRandom(rolls),
    );

    expect(earlyDrops.some((drop) => drop.kind === "key_fragment")).toBe(false);
    expect(lateDrops.some((drop) => drop.kind === "key_fragment")).toBe(true);
  });

  it("uses world tier, not faction, to select dungeon entry currency", () => {
    const morganaT4 = rollCombatDrops(BASE_CONTEXT, () => 0);
    const keeperT4 = rollCombatDrops(
      { ...BASE_CONTEXT, faction: "Keeper" },
      () => 0,
    );
    const morganaT5 = rollCombatDrops(
      { ...BASE_CONTEXT, enchantmentTier: 5 },
      () => 0,
    );

    expect(morganaT4.find((drop) => drop.kind === "key_fragment")?.itemId)
      .toBe("item_resource_dungeon_key_fragment_t4");
    expect(keeperT4.find((drop) => drop.kind === "key_fragment")?.itemId)
      .toBe("item_resource_dungeon_key_fragment_t4");
    expect(morganaT4.find((drop) => drop.kind === "key")?.itemId)
      .toBe("item_resource_dungeon_key_t4");
    expect(morganaT5.find((drop) => drop.kind === "key_fragment")?.itemId)
      .toBe("item_resource_dungeon_key_fragment_t5");
    expect(morganaT5.find((drop) => drop.kind === "key")?.itemId)
      .toBe("item_resource_dungeon_key_t5");
  });

  it("never drops artifacts from normal monsters", () => {
    const drops = rollCombatDrops(
      { ...BASE_CONTEXT, segmentIndex: 9, faction: "Undead" },
      () => 0,
    );

    expect(drops.some((drop) => drop.kind === "artifact_fragment")).toBe(false);
    expect(drops.some((drop) => drop.kind === "artifact")).toBe(false);
  });

  it("keeps artifacts faction-specific for bosses", () => {
    const drops = rollCombatDrops(
      {
        ...BASE_CONTEXT,
        segmentIndex: 9,
        faction: "Keeper",
        isBoss: true,
        isFinalBoss: true,
      },
      () => 0,
    );

    expect(drops.find((drop) => drop.kind === "artifact_fragment")?.itemId)
      .toBe("item_resource_artifact_fragment_keeper");
    expect(drops.find((drop) => drop.kind === "artifact")?.itemId)
      .toBe("item_resource_artifact_keeper");
  });
});

describe("repair economy readiness", () => {
  it("keeps every approved repair category complete for authored repair tiers", () => {
    expect(getAuthoredRepairCostTiers()).toEqual([3, 4]);
    expect(getMissingRepairCostDefinitions([3, 4])).toEqual([]);
  });

  it("reports T5 as an explicit balance gap instead of inventing prices", () => {
    expect(getMissingRepairCostDefinitions([5])).toEqual([
      { itemTier: 5, equipmentCategory: "weapon" },
      { itemTier: 5, equipmentCategory: "armor" },
      { itemTier: 5, equipmentCategory: "accessory" },
    ]);
  });
});
