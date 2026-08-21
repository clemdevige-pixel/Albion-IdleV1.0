import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { InventoryManager } from "../inventory/index.js";
import { DungeonRuntime, type DungeonDefinition } from "./dungeon-runtime.js";

const DEFINITION: DungeonDefinition = {
  id: "dungeon_keeper_t4",
  tier: 4,
  faction: "Keeper",
  keyItemId: "item_key",
  combatProfileId: "combat_profile",
  lootTableId: "loot_table",
  encounters: [{
    id: "boss",
    kind: "boss",
    monsterDefinitionId: "monster_keeper_boss",
  }],
};

function createRuntime() {
  const world = new World(createRuntimeServices());
  const inventory = new InventoryManager(
    world,
    (itemId) => ({ itemId, stackable: true, maxStack: 999 }),
  );
  const heroId = world.createEntity();
  inventory.createInventory(heroId, 10);
  inventory.addQuantity(heroId, DEFINITION.keyItemId, 10);
  return { runtime: new DungeonRuntime([DEFINITION]), inventory, heroId };
}

describe("DungeonRuntime lifetime clear history", () => {
  it("increments the authoritative definition count on every completed run", () => {
    const { runtime, inventory, heroId } = createRuntime();

    runtime.start(DEFINITION.id, heroId, inventory);
    runtime.completeEncounter("boss");
    runtime.clearFinishedRun();
    runtime.start(DEFINITION.id, heroId, inventory);
    runtime.completeEncounter("boss");

    expect(runtime.getCompletedDefinitionCount(DEFINITION.id)).toBe(2);
    expect(runtime.getCompletedDefinitionCounts()).toEqual({
      [DEFINITION.id]: 2,
    });
  });

  it("restores only valid positive counts for registered definitions", () => {
    const { runtime } = createRuntime();
    runtime.restoreCompletedDefinitionCounts({
      [DEFINITION.id]: 7,
      unknown: 12,
      invalid: -1,
    });

    expect(runtime.getCompletedDefinitionCounts()).toEqual({
      [DEFINITION.id]: 7,
    });
  });
});
