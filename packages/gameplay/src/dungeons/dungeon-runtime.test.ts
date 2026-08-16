import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { InventoryManager } from "../inventory/index.js";
import { DungeonRuntime, type DungeonDefinition } from "./dungeon-runtime.js";

const T4_DUNGEON: DungeonDefinition = {
  id: "dungeon_t4_test",
  tier: 4,
  faction: "test",
  keyItemId: "item_resource_dungeon_key_test",
  encounters: [
    { id: "normal_1", kind: "normal", monsterDefinitionId: "monster_test_normal" },
    { id: "normal_2", kind: "normal", monsterDefinitionId: "monster_test_normal" },
    { id: "elite", kind: "elite", monsterDefinitionId: "monster_test_elite" },
    { id: "normal_3", kind: "normal", monsterDefinitionId: "monster_test_normal" },
    { id: "boss", kind: "boss", monsterDefinitionId: "monster_test_boss", lootTableId: "loot_test_boss" },
  ],
};

function setup(keyQuantity = 1) {
  const world = new World(createRuntimeServices());
  const heroId = world.createEntity();
  const inventory = new InventoryManager(world, (itemId) => ({
    itemId,
    stackable: true,
    maxStack: 999,
  }));
  inventory.createInventory(heroId, 12);
  if (keyQuantity > 0) inventory.addQuantity(heroId, T4_DUNGEON.keyItemId, keyQuantity);
  const runtime = new DungeonRuntime([T4_DUNGEON]);
  return { heroId, inventory, runtime };
}

describe("DungeonRuntime", () => {
  it("consumes one key at entry and starts on the first encounter", () => {
    const { heroId, inventory, runtime } = setup(2);

    const result = runtime.start(T4_DUNGEON.id, heroId, inventory);

    expect(result.ok).toBe(true);
    expect(inventory.getTotalQuantity(heroId, T4_DUNGEON.keyItemId)).toBe(1);
    expect(runtime.getActiveEncounter()?.id).toBe("normal_1");
  });

  it("rejects entry without a key", () => {
    const { heroId, inventory, runtime } = setup(0);

    expect(runtime.start(T4_DUNGEON.id, heroId, inventory)).toEqual({ ok: false, reason: "missing_key" });
    expect(runtime.activeRun).toBeUndefined();
  });

  it("advances only after the current encounter and clears on the boss", () => {
    const { heroId, inventory, runtime } = setup();
    runtime.start(T4_DUNGEON.id, heroId, inventory);

    expect(runtime.completeEncounter("normal_2")).toEqual({ ok: false, reason: "encounter_mismatch" });
    for (const encounter of T4_DUNGEON.encounters) {
      expect(runtime.getActiveEncounter()?.id).toBe(encounter.id);
      expect(runtime.completeEncounter(encounter.id).ok).toBe(true);
    }

    expect(runtime.activeRun?.status).toBe("cleared");
    expect(runtime.activeRun?.completedEncounterIds).toEqual(T4_DUNGEON.encounters.map(({ id }) => id));
    expect(runtime.getActiveEncounter()).toBeUndefined();
  });

  it("keeps completed encounter progress when the run fails", () => {
    const { heroId, inventory, runtime } = setup();
    runtime.start(T4_DUNGEON.id, heroId, inventory);
    runtime.completeEncounter("normal_1");
    runtime.completeEncounter("normal_2");

    runtime.fail();

    expect(runtime.activeRun).toMatchObject({
      status: "failed",
      completedEncounterIds: ["normal_1", "normal_2"],
    });
    expect(inventory.getTotalQuantity(heroId, T4_DUNGEON.keyItemId)).toBe(0);
  });

  it("does not refund the key when abandoning", () => {
    const { heroId, inventory, runtime } = setup();
    runtime.start(T4_DUNGEON.id, heroId, inventory);

    runtime.abandon();

    expect(runtime.activeRun?.status).toBe("abandoned");
    expect(inventory.getTotalQuantity(heroId, T4_DUNGEON.keyItemId)).toBe(0);
  });

  it("requires definitions to end in a boss", () => {
    expect(() => new DungeonRuntime([{ ...T4_DUNGEON, encounters: T4_DUNGEON.encounters.slice(0, -1) }])).toThrow(
      /must end with a boss/,
    );
  });
});