import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices, type EntityId } from "@game/core";
import { InventoryManager } from "../inventory-manager.js";
import { InventorySaveProvider } from "../inventory-save-provider.js";
import { toItemInstanceId, type ItemInstanceId } from "../types.js";

function createTestWorld(): World {
  return new World(createRuntimeServices());
}

describe("InventoryManager", () => {
  let world: World;
  let manager: InventoryManager;
  let entityId: EntityId;

  beforeEach(() => {
    world = createTestWorld();
    manager = new InventoryManager(world);
    entityId = world.createEntity();
    manager.createInventory(entityId, 4);
  });

  describe("creation", () => {
    it("creates an inventory with the given capacity", () => {
      expect(manager.hasInventory(entityId)).toBe(true);
      expect(manager.getCapacity(entityId)).toBe(4);
      expect(manager.getOccupiedCount(entityId)).toBe(0);
      expect(manager.listSlots(entityId)).toHaveLength(4);
    });

    it("rejects a non-positive capacity", () => {
      const other = world.createEntity();
      expect(() => manager.createInventory(other, 0)).toThrow();
      expect(() => manager.createInventory(other, -3)).toThrow();
    });

    it("rejects a fractional capacity", () => {
      const other = world.createEntity();
      expect(() => manager.createInventory(other, 2.5)).toThrow();
    });

    it("tracks created inventories", () => {
      expect(manager.listInventories()).toEqual([entityId]);
    });
  });

  describe("addEntry", () => {
    it("adds into the first free slot", () => {
      const result = manager.addEntry(entityId, "RESOURCE_WOOD");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.itemId).toBe("RESOURCE_WOOD");
      expect(result.value.quantity).toBe(1);
      const slot = manager.getSlot(entityId, 0);
      expect(slot.ok && slot.value.entry?.instanceId).toBe(result.value.instanceId);
    });

    it("adds into an explicit position", () => {
      const result = manager.addEntry(entityId, "RESOURCE_ORE", 2);
      expect(result.ok).toBe(true);
      const slot = manager.getSlot(entityId, 2);
      expect(slot.ok && slot.value.entry?.itemId).toBe("RESOURCE_ORE");
    });

    it("refuses to overwrite an occupied slot", () => {
      manager.addEntry(entityId, "RESOURCE_WOOD", 1);
      const result = manager.addEntry(entityId, "RESOURCE_ORE", 1);
      expect(result).toEqual({ ok: false, reason: "slot_occupied" });
      const slot = manager.getSlot(entityId, 1);
      expect(slot.ok && slot.value.entry?.itemId).toBe("RESOURCE_WOOD");
    });

    it("rejects invalid positions", () => {
      expect(manager.addEntry(entityId, "RESOURCE_WOOD", -1)).toEqual({
        ok: false,
        reason: "invalid_position",
      });
      expect(manager.addEntry(entityId, "RESOURCE_WOOD", 4)).toEqual({
        ok: false,
        reason: "invalid_position",
      });
      expect(manager.addEntry(entityId, "RESOURCE_WOOD", 1.5)).toEqual({
        ok: false,
        reason: "invalid_position",
      });
    });

    it("fails when the inventory is full", () => {
      for (let i = 0; i < 4; i += 1) {
        expect(manager.addEntry(entityId, "RESOURCE_WOOD").ok).toBe(true);
      }
      expect(manager.isFull(entityId)).toBe(true);
      expect(manager.addEntry(entityId, "RESOURCE_ORE")).toEqual({
        ok: false,
        reason: "inventory_full",
      });
      expect(manager.getOccupiedCount(entityId)).toBe(4);
    });

    it("generates deterministic monotonic instance ids", () => {
      const a = manager.addEntry(entityId, "RESOURCE_WOOD");
      const b = manager.addEntry(entityId, "RESOURCE_WOOD");
      expect(a.ok && a.value.instanceId).toBe(toItemInstanceId(0));
      expect(b.ok && b.value.instanceId).toBe(toItemInstanceId(1));
    });

    it("never reuses an instance id after removal", () => {
      const a = manager.addEntry(entityId, "RESOURCE_WOOD");
      expect(a.ok).toBe(true);
      manager.removeEntryAt(entityId, 0);
      const b = manager.addEntry(entityId, "RESOURCE_WOOD");
      expect(b.ok && b.value.instanceId).toBe(toItemInstanceId(1));
    });
  });

  describe("removeEntry", () => {
    it("removes by position", () => {
      manager.addEntry(entityId, "RESOURCE_WOOD");
      const result = manager.removeEntryAt(entityId, 0);
      expect(result.ok && result.value.itemId).toBe("RESOURCE_WOOD");
      expect(manager.getOccupiedCount(entityId)).toBe(0);
    });

    it("removes by instance id", () => {
      const added = manager.addEntry(entityId, "RESOURCE_ORE", 3);
      expect(added.ok).toBe(true);
      if (!added.ok) return;
      const result = manager.removeEntryByInstanceId(entityId, added.value.instanceId);
      expect(result.ok && result.value.instanceId).toBe(added.value.instanceId);
      const slot = manager.getSlot(entityId, 3);
      expect(slot.ok && slot.value.entry).toBeUndefined();
    });

    it("fails on empty slot", () => {
      expect(manager.removeEntryAt(entityId, 0)).toEqual({
        ok: false,
        reason: "entry_not_found",
      });
    });

    it("fails on invalid position", () => {
      expect(manager.removeEntryAt(entityId, 99)).toEqual({
        ok: false,
        reason: "invalid_position",
      });
    });

    it("fails on unknown instance id", () => {
      expect(manager.removeEntryByInstanceId(entityId, "item_999" as ItemInstanceId)).toEqual({
        ok: false,
        reason: "entry_not_found",
      });
    });
  });

  describe("moveEntry", () => {
    it("moves an entry to a free slot", () => {
      const added = manager.addEntry(entityId, "RESOURCE_WOOD", 0);
      expect(added.ok).toBe(true);
      const moved = manager.moveEntry(entityId, 0, 3);
      expect(moved.ok).toBe(true);
      const from = manager.getSlot(entityId, 0);
      const to = manager.getSlot(entityId, 3);
      expect(from.ok && from.value.entry).toBeUndefined();
      expect(to.ok && to.value.entry?.itemId).toBe("RESOURCE_WOOD");
    });

    it("fails when the target slot is occupied", () => {
      manager.addEntry(entityId, "RESOURCE_WOOD", 0);
      manager.addEntry(entityId, "RESOURCE_ORE", 1);
      expect(manager.moveEntry(entityId, 0, 1)).toEqual({
        ok: false,
        reason: "slot_occupied",
      });
      const from = manager.getSlot(entityId, 0);
      expect(from.ok && from.value.entry?.itemId).toBe("RESOURCE_WOOD");
    });

    it("fails on empty source slot", () => {
      expect(manager.moveEntry(entityId, 0, 1)).toEqual({
        ok: false,
        reason: "entry_not_found",
      });
    });

    it("fails on invalid positions", () => {
      manager.addEntry(entityId, "RESOURCE_WOOD", 0);
      expect(manager.moveEntry(entityId, 0, 4)).toEqual({
        ok: false,
        reason: "invalid_position",
      });
      expect(manager.moveEntry(entityId, -1, 0)).toEqual({
        ok: false,
        reason: "invalid_position",
      });
    });

    it("is a no-op when source equals target", () => {
      manager.addEntry(entityId, "RESOURCE_WOOD", 2);
      const moved = manager.moveEntry(entityId, 2, 2);
      expect(moved.ok).toBe(true);
      const slot = manager.getSlot(entityId, 2);
      expect(slot.ok && slot.value.entry?.itemId).toBe("RESOURCE_WOOD");
    });
  });

  describe("find", () => {
    it("finds an entry by instance id", () => {
      const added = manager.addEntry(entityId, "RESOURCE_ORE", 2);
      expect(added.ok).toBe(true);
      if (!added.ok) return;
      const found = manager.findEntryByInstanceId(entityId, added.value.instanceId);
      expect(found?.position).toBe(2);
      expect(found?.entry?.itemId).toBe("RESOURCE_ORE");
    });

    it("returns undefined for an unknown instance id", () => {
      expect(manager.findEntryByInstanceId(entityId, "item_42" as ItemInstanceId)).toBeUndefined();
    });

    it("finds all entries for an item id, ordered by position", () => {
      manager.addEntry(entityId, "RESOURCE_WOOD", 3);
      manager.addEntry(entityId, "RESOURCE_ORE", 1);
      manager.addEntry(entityId, "RESOURCE_WOOD", 0);
      const found = manager.findEntriesByItemId(entityId, "RESOURCE_WOOD");
      expect(found.map((slot) => slot.position)).toEqual([0, 3]);
    });

    it("lists free slots", () => {
      manager.addEntry(entityId, "RESOURCE_WOOD", 1);
      expect(manager.findFreeSlots(entityId)).toEqual([0, 2, 3]);
    });
  });

  describe("integrity", () => {
    it("reports a valid inventory as clean", () => {
      manager.addEntry(entityId, "RESOURCE_WOOD");
      manager.addEntry(entityId, "RESOURCE_ORE", 3);
      expect(manager.validateIntegrity(entityId)).toEqual([]);
    });
  });

  describe("destroy", () => {
    it("removes the inventory component and registration", () => {
      manager.destroyInventory(entityId);
      expect(manager.hasInventory(entityId)).toBe(false);
      expect(manager.listInventories()).toEqual([]);
    });
  });
});

describe("active bag (12_INVENTORY §3-§5)", () => {
  const resolveBagInfo = (itemId: string) =>
    itemId === "BAG_SMALL"
      ? { itemId, capacityBonus: 2 }
      : itemId === "BAG_LARGE"
        ? { itemId, capacityBonus: 4 }
        : undefined;

  let world: World;
  let manager: InventoryManager;
  let entityId: EntityId;

  beforeEach(() => {
    world = createTestWorld();
    manager = new InventoryManager(world, undefined, resolveBagInfo);
    entityId = world.createEntity();
    manager.createInventory(entityId, 4);
  });

  it("equips a bag and increases inventory capacity", () => {
    manager.addEntry(entityId, "BAG_SMALL", 0);
    const result = manager.equipBagFromSlot(entityId, 0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.capacity).toBe(6);
    expect(manager.getCapacity(entityId)).toBe(6);
    expect(manager.getBaseCapacity(entityId)).toBe(4);
    expect(manager.getActiveBag(entityId)?.itemId).toBe("BAG_SMALL");
    expect(manager.getOccupiedCount(entityId)).toBe(0);
    // Bonus slots become usable.
    expect(manager.addEntry(entityId, "RESOURCE_WOOD", 5).ok).toBe(true);
  });

  it("refuses to equip a non-bag item into the Bag Slot", () => {
    manager.addEntry(entityId, "RESOURCE_WOOD", 0);
    expect(manager.equipBagFromSlot(entityId, 0)).toEqual({ ok: false, reason: "not_a_bag" });
    expect(manager.getActiveBag(entityId)).toBeUndefined();
  });

  it("replaces the active bag and returns the previous bag to the vacated slot", () => {
    manager.addEntry(entityId, "BAG_SMALL", 0);
    manager.addEntry(entityId, "BAG_LARGE", 1);
    expect(manager.equipBagFromSlot(entityId, 0).ok).toBe(true);
    const result = manager.equipBagFromSlot(entityId, 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.previousBag?.itemId).toBe("BAG_SMALL");
    expect(result.value.capacity).toBe(8);
    // Only one active bag exists (§13); previous bag is back in slot 1, no loss.
    expect(manager.getActiveBag(entityId)?.itemId).toBe("BAG_LARGE");
    const slot = manager.getSlot(entityId, 1);
    expect(slot.ok && slot.value.entry?.itemId).toBe("BAG_SMALL");
    expect(manager.getOccupiedCount(entityId)).toBe(1);
  });

  it("refuses a bag change that would strand items beyond the new capacity", () => {
    manager.addEntry(entityId, "BAG_LARGE", 0);
    manager.equipBagFromSlot(entityId, 0);
    manager.addEntry(entityId, "RESOURCE_WOOD", 7);
    manager.addEntry(entityId, "BAG_SMALL", 1);
    expect(manager.equipBagFromSlot(entityId, 1)).toEqual({
      ok: false,
      reason: "capacity_exceeded",
    });
    expect(manager.getActiveBag(entityId)?.itemId).toBe("BAG_LARGE");
    expect(manager.validateIntegrity(entityId)).toEqual([]);
  });

  it("unequips the bag back to the inventory and restores base capacity", () => {
    manager.addEntry(entityId, "BAG_SMALL", 0);
    manager.equipBagFromSlot(entityId, 0);
    const result = manager.unequipBagToInventory(entityId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.capacity).toBe(4);
    expect(manager.getActiveBag(entityId)).toBeUndefined();
    const slot = manager.getSlot(entityId, 0);
    expect(slot.ok && slot.value.entry?.itemId).toBe("BAG_SMALL");
  });

  it("refuses to unequip when items occupy bonus slots or no slot is free", () => {
    manager.addEntry(entityId, "BAG_SMALL", 0);
    manager.equipBagFromSlot(entityId, 0);
    manager.addEntry(entityId, "RESOURCE_WOOD", 5);
    expect(manager.unequipBagToInventory(entityId)).toEqual({
      ok: false,
      reason: "capacity_exceeded",
    });
    manager.removeEntryAt(entityId, 5);
    for (let i = 0; i < 4; i += 1) {
      manager.addEntry(entityId, "RESOURCE_WOOD", i);
    }
    expect(manager.unequipBagToInventory(entityId)).toEqual({
      ok: false,
      reason: "inventory_full",
    });
    expect(manager.getActiveBag(entityId)?.itemId).toBe("BAG_SMALL");
  });

  it("fails to unequip when no bag is active", () => {
    expect(manager.unequipBagToInventory(entityId)).toEqual({
      ok: false,
      reason: "no_active_bag",
    });
  });

  it("saves and reloads the active bag with its capacity bonus", () => {
    const provider = new InventorySaveProvider(manager, world);
    manager.addEntry(entityId, "BAG_SMALL", 0);
    manager.equipBagFromSlot(entityId, 0);
    manager.addEntry(entityId, "RESOURCE_WOOD", 5);

    const saved = JSON.parse(JSON.stringify(provider.save())) as unknown;

    const world2 = createTestWorld();
    const manager2 = new InventoryManager(world2, undefined, resolveBagInfo);
    const provider2 = new InventorySaveProvider(manager2, world2);
    provider2.load(saved);

    const restored = manager2.listInventories()[0]!;
    expect(manager2.getCapacity(restored)).toBe(6);
    expect(manager2.getActiveBag(restored)?.itemId).toBe("BAG_SMALL");
    const slot = manager2.getSlot(restored, 5);
    expect(slot.ok && slot.value.entry?.itemId).toBe("RESOURCE_WOOD");
    expect(manager2.validateIntegrity(restored)).toEqual([]);
  });

  it("rejects save data whose active bag is not a bag", () => {
    const provider = new InventorySaveProvider(manager, world);
    const corrupted = {
      inventories: [
        {
          capacity: 4,
          nextInstanceCounter: 1,
          slots: [],
          activeBag: { instanceId: "item_0", itemId: "RESOURCE_WOOD", quantity: 1 },
        },
      ],
    };
    expect(() => provider.load(corrupted)).toThrow(/is not a bag/);
  });
});

describe("InventorySaveProvider", () => {
  it("serializes inventories with capacity, slots and counter", () => {
    const world = createTestWorld();
    const manager = new InventoryManager(world);
    const provider = new InventorySaveProvider(manager, world);
    const entityId = world.createEntity();
    manager.createInventory(entityId, 3);
    manager.addEntry(entityId, "RESOURCE_WOOD");
    manager.addEntry(entityId, "EQUIPMENT_SWORD", 2);

    const data = provider.save() as {
      inventories: {
        capacity: number;
        nextInstanceCounter: number;
        slots: { position: number; instanceId: string; itemId: string; quantity: number }[];
      }[];
    };
    expect(data.inventories).toHaveLength(1);
    const saved = data.inventories[0]!;
    expect(saved.capacity).toBe(3);
    expect(saved.nextInstanceCounter).toBe(2);
    expect(saved.slots).toEqual([
      { position: 0, instanceId: "item_0", itemId: "RESOURCE_WOOD", quantity: 1, enchantment: 0 },
      { position: 2, instanceId: "item_1", itemId: "EQUIPMENT_SWORD", quantity: 1, enchantment: 0 },
    ]);
  });

  it("roundtrips into a fresh world with identical state, no loss, no duplication", () => {
    const world = createTestWorld();
    const manager = new InventoryManager(world);
    const provider = new InventorySaveProvider(manager, world);
    const entityId = world.createEntity();
    manager.createInventory(entityId, 5);
    manager.addEntry(entityId, "RESOURCE_WOOD");
    manager.addEntry(entityId, "RESOURCE_ORE", 4);
    manager.removeEntryAt(entityId, 0);
    manager.addEntry(entityId, "CURRENCY_SILVER", 1);

    const saved = JSON.parse(JSON.stringify(provider.save())) as unknown;

    const world2 = createTestWorld();
    const manager2 = new InventoryManager(world2);
    const provider2 = new InventorySaveProvider(manager2, world2);
    provider2.load(saved);

    expect(manager2.listInventories()).toHaveLength(1);
    const restored = manager2.listInventories()[0]!;
    expect(manager2.getCapacity(restored)).toBe(5);
    expect(manager2.getOccupiedCount(restored)).toBe(2);
    expect(manager2.validateIntegrity(restored)).toEqual([]);
    expect(manager2.listSlots(restored)).toEqual(manager.listSlots(entityId));

    const next = manager2.addEntry(restored, "RESOURCE_WOOD");
    expect(next.ok && next.value.instanceId).toBe(toItemInstanceId(3));
  });

  it("roundtrips an empty and a full inventory", () => {
    const world = createTestWorld();
    const manager = new InventoryManager(world);
    const provider = new InventorySaveProvider(manager, world);
    const empty = world.createEntity();
    manager.createInventory(empty, 2);
    const full = world.createEntity();
    manager.createInventory(full, 2);
    manager.addEntry(full, "RESOURCE_WOOD");
    manager.addEntry(full, "RESOURCE_WOOD");

    const world2 = createTestWorld();
    const manager2 = new InventoryManager(world2);
    const provider2 = new InventorySaveProvider(manager2, world2);
    provider2.load(JSON.parse(JSON.stringify(provider.save())));

    const restored = manager2.listInventories();
    expect(restored).toHaveLength(2);
    expect(manager2.getOccupiedCount(restored[0]!)).toBe(0);
    expect(manager2.isFull(restored[1]!)).toBe(true);
    expect(manager2.validateIntegrity(restored[0]!)).toEqual([]);
    expect(manager2.validateIntegrity(restored[1]!)).toEqual([]);
  });

  it("rejects corrupted save data with duplicate instance ids", () => {
    const world = createTestWorld();
    const manager = new InventoryManager(world);
    const provider = new InventorySaveProvider(manager, world);
    const corrupted = {
      inventories: [
        {
          capacity: 3,
          nextInstanceCounter: 2,
          slots: [
            { position: 0, instanceId: "item_0", itemId: "RESOURCE_WOOD", quantity: 1 },
            { position: 1, instanceId: "item_0", itemId: "RESOURCE_WOOD", quantity: 1 },
          ],
        },
      ],
    };
    expect(() => provider.load(corrupted)).toThrow(/Duplicate instance id/);
  });

  it("rejects corrupted save data with out-of-range positions", () => {
    const world = createTestWorld();
    const manager = new InventoryManager(world);
    const provider = new InventorySaveProvider(manager, world);
    const corrupted = {
      inventories: [
        {
          capacity: 2,
          nextInstanceCounter: 1,
          slots: [{ position: 5, instanceId: "item_0", itemId: "RESOURCE_WOOD", quantity: 1 }],
        },
      ],
    };
    expect(() => provider.load(corrupted)).toThrow(/invalid position/);
  });
});
