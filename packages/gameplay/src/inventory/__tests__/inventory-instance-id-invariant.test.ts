import { createRuntimeServices, World } from "@game/core";
import { describe, expect, it } from "vitest";
import { InventoryComponent } from "../components.js";
import { InventoryManager } from "../inventory-manager.js";
import { InventorySaveProvider } from "../inventory-save-provider.js";
import { toItemInstanceId, type InventoryEntry } from "../types.js";

function createInventoryFixture() {
  const world = new World(createRuntimeServices());
  const manager = new InventoryManager(world);
  const entityId = world.createEntity();
  manager.createInventory(entityId, 4);
  return { world, manager, entityId };
}

describe("inventory instance id invariant", () => {
  it("advances the allocator past a reinserted existing item id", () => {
    const { manager, entityId } = createInventoryFixture();
    const returningEntry: InventoryEntry = {
      instanceId: toItemInstanceId(41),
      itemId: "RESOURCE_WOOD",
      quantity: 1,
      enchantment: 0,
    };

    expect(manager.insertEntry(entityId, returningEntry).ok).toBe(true);

    const created = manager.addEntry(entityId, "RESOURCE_ORE");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.instanceId).toBe(toItemInstanceId(42));
    expect(manager.validateIntegrity(entityId)).toEqual([]);
  });

  it("refuses to persist a runtime inventory that already contains duplicate ids", () => {
    const { world, manager, entityId } = createInventoryFixture();
    const data = world.getComponent(entityId, InventoryComponent);
    const duplicateId = toItemInstanceId(41);
    data.slots.set(0, {
      instanceId: duplicateId,
      itemId: "RESOURCE_WOOD",
      quantity: 1,
      enchantment: 0,
    });
    data.slots.set(1, {
      instanceId: duplicateId,
      itemId: "RESOURCE_ORE",
      quantity: 1,
      enchantment: 0,
    });

    const provider = new InventorySaveProvider(manager, world);
    expect(() => provider.save()).toThrow(
      "Refusing to persist invalid inventory data: Duplicate instance id: item_41",
    );
  });
});
