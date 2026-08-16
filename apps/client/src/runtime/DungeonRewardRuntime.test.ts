import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { DungeonRuntime, InventoryManager } from "@game/gameplay";
import { KEEPER_T4_DUNGEON } from "../data/dungeonContentCatalog.js";
import { DungeonRewardRuntime } from "./DungeonRewardRuntime.js";

function setup(random = () => 1) {
  const world = new World(createRuntimeServices());
  const heroId = world.createEntity();
  const inventory = new InventoryManager(world, (itemId) => ({ itemId, stackable: true, maxStack: 999 }));
  inventory.createInventory(heroId, 20);
  inventory.addQuantity(heroId, KEEPER_T4_DUNGEON.keyItemId, 1);
  const dungeon = new DungeonRuntime([KEEPER_T4_DUNGEON]);
  dungeon.start(KEEPER_T4_DUNGEON.id, heroId, inventory);
  const rewards = new DungeonRewardRuntime(dungeon, inventory, heroId, random);
  return { heroId, inventory, dungeon, rewards };
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
    expect(inventory.getTotalQuantity(heroId, "item_resource_artifact_fragment_keeper")).toBe(4);
  });

  it("only rolls a complete artifact on the boss definition", () => {
    const { heroId, inventory, dungeon, rewards } = setup(() => 0);

    for (const encounter of KEEPER_T4_DUNGEON.encounters.slice(0, -1)) {
      rewards.processCurrentEncounterVictory();
      dungeon.completeEncounter(encounter.id);
    }

    const bossReward = rewards.processCurrentEncounterVictory();

    expect(bossReward?.drops).toContainEqual({
      itemId: "item_resource_artifact_keeper",
      kind: "artifact",
      quantity: 1,
    });
    expect(inventory.getTotalQuantity(heroId, "item_resource_artifact_keeper")).toBe(1);
  });
});
