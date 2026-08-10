import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { InventoryManager } from "@game/gameplay";
import { StorageRuntime } from "./StorageRuntime";

function setup() {
  const world = new World(createRuntimeServices());
  const manager = new InventoryManager(
    world,
    (itemId) => ({ itemId, stackable: itemId === "stack", maxStack: 99 }),
  );
  const heroId = world.createEntity();
  const bankId = world.createEntity();
  manager.createInventory(heroId, 6);
  manager.createInventory(bankId, 6);
  return { manager, heroId, bankId, storage: new StorageRuntime(manager, heroId, bankId) };
}

function itemAt(manager: InventoryManager, ownerId: ReturnType<World["createEntity"]>, position: number) {
  const slot = manager.getSlot(ownerId, position);
  return slot.ok ? slot.value.entry : undefined;
}

describe("StorageRuntime", () => {
  it("moves an item to an explicit empty slot", () => {
    const { manager, heroId, storage } = setup();
    manager.addEntry(heroId, "sword", 0);
    expect(storage.moveWithin("inventory", 0, 4).ok).toBe(true);
    expect(itemAt(manager, heroId, 0)).toBeUndefined();
    expect(itemAt(manager, heroId, 4)?.itemId).toBe("sword");
  });

  it("swaps incompatible occupied slots", () => {
    const { manager, heroId, storage } = setup();
    manager.addEntry(heroId, "sword", 0);
    manager.addEntry(heroId, "bow", 1);
    expect(storage.moveWithin("inventory", 0, 1).ok).toBe(true);
    expect(itemAt(manager, heroId, 0)?.itemId).toBe("bow");
    expect(itemAt(manager, heroId, 1)?.itemId).toBe("sword");
  });

  it("transfers an entry between inventory and bank while preserving identity", () => {
    const { manager, heroId, bankId, storage } = setup();
    const created = manager.addEntry(heroId, "sword", 0);
    if (!created.ok) throw new Error("setup failed");
    expect(storage.transfer("inventory", 0, "bank", 3).ok).toBe(true);
    expect(itemAt(manager, heroId, 0)).toBeUndefined();
    expect(itemAt(manager, bankId, 3)?.instanceId).toBe(created.value.instanceId);
    expect(storage.transfer("bank", 3, "inventory", 2).ok).toBe(true);
    expect(itemAt(manager, heroId, 2)?.instanceId).toBe(created.value.instanceId);
  });

  it("sorts occupied slots deterministically and compacts them", () => {
    const { manager, bankId, storage } = setup();
    manager.addEntry(bankId, "z_item", 5);
    manager.addEntry(bankId, "a_item", 3);
    expect(storage.sort("bank").ok).toBe(true);
    expect(itemAt(manager, bankId, 0)?.itemId).toBe("a_item");
    expect(itemAt(manager, bankId, 1)?.itemId).toBe("z_item");
    expect(itemAt(manager, bankId, 3)).toBeUndefined();
  });
});
