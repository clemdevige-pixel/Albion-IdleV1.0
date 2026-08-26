import { getFactionRuneItemId } from "@game/data";
import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { DungeonRuntime, getEnchantmentShardItemId } from "@game/gameplay";
import { KEEPER_T4_DUNGEON } from "../data/dungeonContentCatalog.js";
import {
  DUNGEON_COMPLETION_FACTION_RUNES_BY_TIER,
  DUNGEON_COMPLETION_SILVER_BY_TIER,
} from "../data/dungeonLootContentCatalog.js";
import { DungeonRewardRuntime } from "./DungeonRewardRuntime.js";
import { PlayerInventoryManager } from "./PlayerInventoryManager.js";

function setup(random = () => 1, heroCapacity = 20) {
  const world = new World(createRuntimeServices());
  const heroId = world.createEntity();
  const bankId = world.createEntity();
  const inventory = new PlayerInventoryManager(
    world,
    (itemId) => ({ itemId, stackable: true, maxStack: 999 }),
  );
  inventory.createInventory(heroId, heroCapacity);
  inventory.createInventory(bankId, 20);
  inventory.setAccessibleStorageOwners(heroId, [heroId, bankId]);
  inventory.addQuantity(heroId, KEEPER_T4_DUNGEON.keyItemId, 1);
  const dungeon = new DungeonRuntime([KEEPER_T4_DUNGEON]);
  dungeon.start(KEEPER_T4_DUNGEON.id, heroId, inventory);
  const rewards = new DungeonRewardRuntime(dungeon, inventory, heroId, random);
  return { heroId, bankId, inventory, dungeon, rewards };
}

describe("DungeonRewardRuntime", () => {
  it("commits encounter fragments immediately so they survive a later failure", () => {
    const { heroId, inventory, dungeon, rewards } = setup();

    const result = rewards.processCurrentEncounterVictory();
    dungeon.completeEncounter("keeper_t4_normal_1");
    dungeon.fail();

    expect(result?.drops).toEqual([
      { itemId: "item_resource_artifact_fragment_keeper", kind: "artifact_fragment", quantity: 4 },
    ]);
    expect(result?.completionSilver).toBe(0);
    expect(inventory.getTotalQuantity(heroId, "item_resource_artifact_fragment_keeper")).toBe(4);
    expect(inventory.getTotalQuantity(heroId, getEnchantmentShardItemId(4))).toBe(0);
    expect(inventory.getTotalQuantity(heroId, getFactionRuneItemId(4))).toBe(0);
  });

  it("uses the bank when dungeon loot cannot fit in the hero inventory", () => {
    const { heroId, bankId, inventory, rewards } = setup(() => 1, 1);
    inventory.addQuantity(heroId, "item_health_potion", 1);
    expect(inventory.isFull(heroId)).toBe(true);

    const result = rewards.processCurrentEncounterVictory();

    expect(result?.drops).toEqual([
      { itemId: "item_resource_artifact_fragment_keeper", kind: "artifact_fragment", quantity: 4 },
    ]);
    expect(inventory.getTotalQuantity(heroId, "item_resource_artifact_fragment_keeper")).toBe(0);
    expect(inventory.getTotalQuantity(bankId, "item_resource_artifact_fragment_keeper")).toBe(4);
  });

  it("grants the authored shard total, guaranteed completion Runes and completion Silver only on the boss", () => {
    const { heroId, inventory, dungeon, rewards } = setup(() => 0);
    const shardItemId = getEnchantmentShardItemId(4);
    const runeItemId = getFactionRuneItemId(4);

    for (const encounter of KEEPER_T4_DUNGEON.encounters.slice(0, -1)) {
      const reward = rewards.processCurrentEncounterVictory();
      expect(reward?.completionSilver).toBe(0);
      expect(reward?.drops.some((drop) => drop.kind === "faction_rune")).toBe(false);
      dungeon.completeEncounter(encounter.id);
    }

    const bossReward = rewards.processCurrentEncounterVictory();

    expect(bossReward?.drops).toContainEqual({
      itemId: "item_resource_artifact_keeper",
      kind: "artifact",
      quantity: 1,
    });
    expect(bossReward?.drops).toContainEqual({
      itemId: shardItemId,
      kind: "enchantment_shard",
      quantity: 4,
    });
    expect(bossReward?.drops).toContainEqual({
      itemId: runeItemId,
      kind: "faction_rune",
      quantity: DUNGEON_COMPLETION_FACTION_RUNES_BY_TIER[4],
    });
    expect(bossReward?.completionSilver).toBe(DUNGEON_COMPLETION_SILVER_BY_TIER[4]);
    expect(inventory.getTotalQuantity(heroId, "item_resource_artifact_keeper")).toBe(1);
    expect(inventory.getTotalQuantity(heroId, shardItemId)).toBe(5);
    expect(inventory.getTotalQuantity(heroId, runeItemId)).toBe(
      DUNGEON_COMPLETION_FACTION_RUNES_BY_TIER[4],
    );
  });

  it("applies faction mastery to dungeon quantities, completion Runes, drop chance and completion Silver", () => {
    const { heroId, inventory, dungeon, rewards } = setup(() => 0.12);
    const shardItemId = getEnchantmentShardItemId(4);
    const runeItemId = getFactionRuneItemId(4);
    const getFactionYieldBonusPercent = () => 50;

    const firstReward = rewards.processCurrentEncounterVictory(getFactionYieldBonusPercent);
    expect(firstReward?.drops).toContainEqual({
      itemId: "item_resource_artifact_fragment_keeper",
      kind: "artifact_fragment",
      quantity: 6,
    });

    for (const encounter of KEEPER_T4_DUNGEON.encounters.slice(0, -1)) {
      if (encounter.id !== KEEPER_T4_DUNGEON.encounters[0]?.id) {
        rewards.processCurrentEncounterVictory(getFactionYieldBonusPercent);
      }
      dungeon.completeEncounter(encounter.id);
    }

    const bossReward = rewards.processCurrentEncounterVictory(getFactionYieldBonusPercent);

    expect(bossReward?.drops).toContainEqual({
      itemId: "item_resource_artifact_keeper",
      kind: "artifact",
      quantity: 1,
    });
    expect(bossReward?.drops).toContainEqual({
      itemId: shardItemId,
      kind: "enchantment_shard",
      quantity: 6,
    });
    expect(bossReward?.drops).toContainEqual({
      itemId: runeItemId,
      kind: "faction_rune",
      quantity: 3,
    });
    expect(bossReward?.completionSilver).toBe(
      DUNGEON_COMPLETION_SILVER_BY_TIER[4] * 1.5,
    );
    expect(inventory.getTotalQuantity(heroId, shardItemId)).toBe(8);
    expect(inventory.getTotalQuantity(heroId, runeItemId)).toBe(3);
  });
});
