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
  it("allocates instance ids globally across separate inventories", () => {
    const world = new World(createRuntimeServices());
    const manager = new InventoryManager(world);
    const heroId = world.createEntity();
    const bankId = world.createEntity();
    manager.createInventory(heroId, 4);
    manager.createInventory(bankId, 4);

    const heroItem = manager.addEntry(heroId, "RESOURCE_WOOD");
    const bankItem = manager.addEntry(bankId, "RESOURCE_ORE");

    expect(heroItem.ok).toBe(true);
    expect(bankItem.ok).toBe(true);
    if (!heroItem.ok || !bankItem.ok) return;
    expect(heroItem.value.instanceId).toBe("item_0");
    expect(bankItem.value.instanceId).toBe("item_1");
    expect(manager.validateGlobalInstanceIds()).toEqual([]);
  });

  it("keeps the global allocator monotonic after an inventory is destroyed and recreated", () => {
    const world = new World(createRuntimeServices());
    const manager = new InventoryManager(world);
    const firstId = world.createEntity();
    manager.createInventory(firstId, 4);

    const first = manager.addEntry(firstId, "RESOURCE_WOOD");
    const second = manager.addEntry(firstId, "RESOURCE_ORE");
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.value.instanceId).toBe("item_1");

    manager.destroyInventory(firstId);
    const replacementId = world.createEntity();
    manager.createInventory(replacementId, 4);
    const replacement = manager.addEntry(replacementId, "RESOURCE_HIDE");

    expect(replacement.ok).toBe(true);
    if (!replacement.ok) return;
    expect(replacement.value.instanceId).toBe("item_2");
  });

  it("refuses to insert an instance id that is already stored elsewhere", () => {
    const world = new World(createRuntimeServices());
    const manager = new InventoryManager(world);
    const heroId = world.createEntity();
    const bankId = world.createEntity();
    manager.createInventory(heroId, 4);
    manager.createInventory(bankId, 4);

    const created = manager.addEntry(heroId, "RESOURCE_WOOD");
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(manager.insertEntry(bankId, created.value)).toEqual({
      ok: false,
      reason: "duplicate_instance_id",
    });
  });

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

  it("repairs stale saved allocators to one global high-watermark before minting", () => {
    const world = new World(createRuntimeServices());
    const manager = new InventoryManager(world);
    const heroId = world.createEntity();
    const bankId = world.createEntity();
    const provider = new InventorySaveProvider(
      manager,
      world,
      (index) => index === 0 ? heroId : bankId,
    );

    provider.load({
      inventories: [
        {
          capacity: 4,
          nextInstanceCounter: 12,
          slots: [
            {
              position: 0,
              instanceId: "item_42",
              itemId: "RESOURCE_WOOD",
              quantity: 1,
              enchantment: 0,
            },
          ],
          activeBag: null,
        },
        {
          capacity: 4,
          nextInstanceCounter: 2,
          slots: [],
          activeBag: null,
        },
      ],
    });

    expect(world.getComponent(heroId, InventoryComponent).nextInstanceCounter).toBe(43);
    expect(world.getComponent(bankId, InventoryComponent).nextInstanceCounter).toBe(43);

    const created = manager.addEntry(bankId, "RESOURCE_ORE");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.instanceId).toBe("item_43");
    expect(manager.validateGlobalInstanceIds()).toEqual([]);
  });

  it("rejects a save payload that duplicates an instance id across inventories", () => {
    const world = new World(createRuntimeServices());
    const manager = new InventoryManager(world);
    const heroId = world.createEntity();
    const bankId = world.createEntity();
    const provider = new InventorySaveProvider(
      manager,
      world,
      (index) => index === 0 ? heroId : bankId,
    );

    expect(() => provider.load({
      inventories: [
        {
          capacity: 4,
          nextInstanceCounter: 2,
          slots: [{
            position: 0,
            instanceId: "item_1",
            itemId: "RESOURCE_WOOD",
            quantity: 1,
            enchantment: 0,
          }],
          activeBag: null,
        },
        {
          capacity: 4,
          nextInstanceCounter: 2,
          slots: [{
            position: 0,
            instanceId: "item_1",
            itemId: "RESOURCE_ORE",
            quantity: 1,
            enchantment: 0,
          }],
          activeBag: null,
        },
      ],
    })).toThrow("Duplicate instance id across inventories: item_1");
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
    expect(() => provider.save()).toThrow("Duplicate instance id across inventories: item_41");
  });
});