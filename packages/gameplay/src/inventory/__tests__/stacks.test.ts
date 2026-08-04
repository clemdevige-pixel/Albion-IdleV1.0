import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices, type EntityId } from "@game/core";
import { InventoryManager } from "../inventory-manager.js";
import { InventorySaveProvider } from "../inventory-save-provider.js";
import type { ItemStackInfoLike, StackInfoResolver } from "../types.js";

const STACK_INFO: Record<string, ItemStackInfoLike> = {
  RESOURCE_WOOD: { itemId: "RESOURCE_WOOD", stackable: true, maxStack: 10 },
  RESOURCE_ORE: { itemId: "RESOURCE_ORE", stackable: true, maxStack: 5 },
  EQUIPMENT_SWORD: { itemId: "EQUIPMENT_SWORD", stackable: false, maxStack: 1 },
};

const resolver: StackInfoResolver = (itemId) => STACK_INFO[itemId];

function createTestWorld(): World {
  return new World(createRuntimeServices());
}

describe("InventoryManager stacks", () => {
  let world: World;
  let manager: InventoryManager;
  let entityId: EntityId;

  beforeEach(() => {
    world = createTestWorld();
    manager = new InventoryManager(world, resolver);
    entityId = world.createEntity();
    manager.createInventory(entityId, 4);
  });

  function quantities(): (number | undefined)[] {
    return manager.listSlots(entityId).map((slot) => slot.entry?.quantity);
  }

  it("keeps different enchantment levels in separate stacks", () => {
    expect(manager.addQuantity(entityId, "RESOURCE_WOOD", 2, undefined, 1).ok).toBe(true);
    expect(manager.addQuantity(entityId, "RESOURCE_WOOD", 3, undefined, 2).ok).toBe(true);

    const occupied = manager.listSlots(entityId).filter((slot) => slot.entry !== undefined);
    expect(occupied).toHaveLength(2);
    expect(occupied.map((slot) => slot.entry?.enchantment)).toEqual([1, 2]);
  });

  it("merges legacy entries without enchantment into level zero", () => {
    const inserted = manager.insertEntry(entityId, {
      instanceId: "item_99" as never,
      itemId: "RESOURCE_WOOD",
      quantity: 2,
    });
    expect(inserted.ok).toBe(true);

    expect(manager.addQuantity(entityId, "RESOURCE_WOOD", 3).ok).toBe(true);
    expect(manager.getTotalQuantity(entityId, "RESOURCE_WOOD")).toBe(5);
    expect(manager.listSlots(entityId).filter((slot) => slot.entry !== undefined)).toHaveLength(1);
  });

  describe("addQuantity", () => {
    it("fills an existing partial stack before creating new stacks", () => {
      manager.addQuantity(entityId, "RESOURCE_WOOD", 4);
      const result = manager.addQuantity(entityId, "RESOURCE_WOOD", 8);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toEqual({
        requested: 8,
        added: 8,
        remainder: 0,
        affectedPositions: [0, 1],
      });
      expect(quantities()).toEqual([10, 2, undefined, undefined]);
    });

    it("fills partial stacks in ascending position order", () => {
      manager.addQuantity(entityId, "RESOURCE_WOOD", 8);
      manager.addQuantity(entityId, "RESOURCE_ORE", 3);
      const before = manager.getSlot(entityId, 0);
      expect(before.ok && before.value.entry?.quantity).toBe(8);
      const result = manager.addQuantity(entityId, "RESOURCE_WOOD", 5);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.affectedPositions).toEqual([0, 2]);
      expect(quantities()).toEqual([10, 3, 3, undefined]);
    });

    it("creates a new stack when no partial stack exists", () => {
      const result = manager.addQuantity(entityId, "RESOURCE_ORE", 3);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.added).toBe(3);
      expect(quantities()).toEqual([3, undefined, undefined, undefined]);
    });

    it("splits large additions across multiple new stacks", () => {
      const result = manager.addQuantity(entityId, "RESOURCE_ORE", 12);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.remainder).toBe(0);
      expect(quantities()).toEqual([5, 5, 2, undefined]);
    });

    it("returns a partial result with remainder when maxStack and capacity overflow", () => {
      manager.addQuantity(entityId, "EQUIPMENT_SWORD", 3);
      const result = manager.addQuantity(entityId, "RESOURCE_ORE", 9);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toEqual({
        requested: 9,
        added: 5,
        remainder: 4,
        affectedPositions: [3],
      });
      expect(manager.getTotalQuantity(entityId, "RESOURCE_ORE")).toBe(5);
    });

    it("fails without mutation when the inventory is completely full", () => {
      manager.addQuantity(entityId, "RESOURCE_ORE", 20);
      expect(manager.isFull(entityId)).toBe(true);
      const result = manager.addQuantity(entityId, "RESOURCE_WOOD", 1);
      expect(result).toEqual({ ok: false, reason: "inventory_full" });
      expect(manager.getTotalQuantity(entityId, "RESOURCE_ORE")).toBe(20);
    });

    it("still tops off partial stacks when no free slot remains", () => {
      manager.addQuantity(entityId, "RESOURCE_ORE", 18);
      expect(manager.isFull(entityId)).toBe(true);
      const result = manager.addQuantity(entityId, "RESOURCE_ORE", 5);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.added).toBe(2);
      expect(result.value.remainder).toBe(3);
      expect(quantities()).toEqual([5, 5, 5, 5]);
    });

    it("gives each non-stackable item its own slot with quantity 1", () => {
      const result = manager.addQuantity(entityId, "EQUIPMENT_SWORD", 3);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.added).toBe(3);
      expect(quantities()).toEqual([1, 1, 1, undefined]);
      const slots = manager.findEntriesByItemId(entityId, "EQUIPMENT_SWORD");
      const ids = new Set(slots.map((slot) => slot.entry?.instanceId));
      expect(ids.size).toBe(3);
    });

    it("treats unknown items as non-stackable", () => {
      const result = manager.addQuantity(entityId, "UNKNOWN_ITEM", 2);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(quantities()).toEqual([1, 1, undefined, undefined]);
    });

    it("accepts explicit stack info overriding the resolver", () => {
      const result = manager.addQuantity(entityId, "RESOURCE_STONE", 7, {
        itemId: "RESOURCE_STONE",
        stackable: true,
        maxStack: 4,
      });
      expect(result.ok).toBe(true);
      expect(quantities()).toEqual([4, 3, undefined, undefined]);
    });

    it("rejects non-positive or fractional quantities", () => {
      expect(manager.addQuantity(entityId, "RESOURCE_WOOD", 0)).toEqual({
        ok: false,
        reason: "invalid_quantity",
      });
      expect(manager.addQuantity(entityId, "RESOURCE_WOOD", -3)).toEqual({
        ok: false,
        reason: "invalid_quantity",
      });
      expect(manager.addQuantity(entityId, "RESOURCE_WOOD", 1.5)).toEqual({
        ok: false,
        reason: "invalid_quantity",
      });
      expect(manager.getOccupiedCount(entityId)).toBe(0);
    });

    it("conserves exact quantity across arbitrary additions", () => {
      let expected = 0;
      for (const amount of [7, 13, 1, 9]) {
        const result = manager.addQuantity(entityId, "RESOURCE_WOOD", amount);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.added + result.value.remainder).toBe(amount);
        expected += result.value.added;
      }
      expect(manager.getTotalQuantity(entityId, "RESOURCE_WOOD")).toBe(expected);
      expect(manager.validateIntegrity(entityId)).toEqual([]);
    });
  });

  describe("removeQuantity", () => {
    it("removes part of a single stack", () => {
      manager.addQuantity(entityId, "RESOURCE_WOOD", 8);
      const result = manager.removeQuantity(entityId, "RESOURCE_WOOD", 3);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toEqual({ removed: 3, emptiedPositions: [] });
      expect(quantities()).toEqual([5, undefined, undefined, undefined]);
    });

    it("removes across stacks in ascending position order", () => {
      manager.addQuantity(entityId, "RESOURCE_ORE", 12);
      const result = manager.removeQuantity(entityId, "RESOURCE_ORE", 7);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.emptiedPositions).toEqual([0]);
      expect(quantities()).toEqual([undefined, 3, 2, undefined]);
    });

    it("removes a complete quantity, freeing all slots", () => {
      manager.addQuantity(entityId, "RESOURCE_ORE", 12);
      const result = manager.removeQuantity(entityId, "RESOURCE_ORE", 12);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.emptiedPositions).toEqual([0, 1, 2]);
      expect(manager.getOccupiedCount(entityId)).toBe(0);
    });

    it("fails atomically when the quantity is insufficient", () => {
      manager.addQuantity(entityId, "RESOURCE_WOOD", 4);
      const result = manager.removeQuantity(entityId, "RESOURCE_WOOD", 5);
      expect(result).toEqual({ ok: false, reason: "insufficient_quantity" });
      expect(manager.getTotalQuantity(entityId, "RESOURCE_WOOD")).toBe(4);
    });

    it("rejects invalid quantities", () => {
      manager.addQuantity(entityId, "RESOURCE_WOOD", 4);
      expect(manager.removeQuantity(entityId, "RESOURCE_WOOD", 0)).toEqual({
        ok: false,
        reason: "invalid_quantity",
      });
      expect(manager.removeQuantity(entityId, "RESOURCE_WOOD", 2.5)).toEqual({
        ok: false,
        reason: "invalid_quantity",
      });
    });
  });

  describe("mergeStacks", () => {
    it("merges completely and frees the source slot", () => {
      manager.addQuantity(entityId, "RESOURCE_WOOD", 3);
      manager.splitStack(entityId, 0, 2, 1);
      const result = manager.mergeStacks(entityId, 2, 0);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toEqual({ moved: 1, sourceEmptied: true });
      expect(quantities()).toEqual([3, undefined, undefined, undefined]);
    });

    it("merges partially when the target hits maxStack", () => {
      manager.addQuantity(entityId, "RESOURCE_ORE", 8);
      manager.removeQuantity(entityId, "RESOURCE_ORE", 1);
      const result = manager.mergeStacks(entityId, 1, 0);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toEqual({ moved: 1, sourceEmptied: false });
      expect(quantities()).toEqual([5, 2, undefined, undefined]);
    });

    it("fails when the target stack is already full", () => {
      manager.addQuantity(entityId, "RESOURCE_ORE", 8);
      expect(manager.mergeStacks(entityId, 1, 0)).toBeDefined();
      expect(manager.mergeStacks(entityId, 1, 0)).toEqual({
        ok: false,
        reason: "stack_full",
      });
    });

    it("fails on different item ids", () => {
      manager.addQuantity(entityId, "RESOURCE_WOOD", 2);
      manager.addQuantity(entityId, "RESOURCE_ORE", 2);
      expect(manager.mergeStacks(entityId, 0, 1)).toEqual({
        ok: false,
        reason: "stack_incompatible",
      });
    });

    it("fails on non-stackable items", () => {
      manager.addQuantity(entityId, "EQUIPMENT_SWORD", 2);
      expect(manager.mergeStacks(entityId, 0, 1)).toEqual({
        ok: false,
        reason: "not_stackable",
      });
    });

    it("fails on empty slots and invalid positions", () => {
      manager.addQuantity(entityId, "RESOURCE_WOOD", 2);
      expect(manager.mergeStacks(entityId, 0, 3)).toEqual({
        ok: false,
        reason: "entry_not_found",
      });
      expect(manager.mergeStacks(entityId, 0, 0)).toEqual({
        ok: false,
        reason: "invalid_position",
      });
      expect(manager.mergeStacks(entityId, 0, 9)).toEqual({
        ok: false,
        reason: "invalid_position",
      });
    });
  });

  describe("splitStack", () => {
    it("splits into a free slot with a fresh instance id", () => {
      manager.addQuantity(entityId, "RESOURCE_WOOD", 9);
      const source = manager.getSlot(entityId, 0);
      const sourceId = source.ok ? source.value.entry?.instanceId : undefined;
      const result = manager.splitStack(entityId, 0, 3, 4);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.quantity).toBe(4);
      expect(result.value.instanceId).not.toBe(sourceId);
      expect(quantities()).toEqual([5, undefined, undefined, 4]);
    });

    it("rejects a split quantity of zero, negative, fractional or the full stack", () => {
      manager.addQuantity(entityId, "RESOURCE_WOOD", 6);
      for (const quantity of [0, -1, 2.5, 6, 7]) {
        expect(manager.splitStack(entityId, 0, 1, quantity)).toEqual({
          ok: false,
          reason: "invalid_quantity",
        });
      }
      expect(quantities()).toEqual([6, undefined, undefined, undefined]);
    });

    it("fails when the target slot is occupied", () => {
      manager.addQuantity(entityId, "RESOURCE_WOOD", 6);
      manager.addQuantity(entityId, "RESOURCE_ORE", 2);
      expect(manager.splitStack(entityId, 0, 1, 2)).toEqual({
        ok: false,
        reason: "slot_occupied",
      });
    });

    it("fails on non-stackable items", () => {
      manager.addQuantity(entityId, "EQUIPMENT_SWORD", 1);
      expect(manager.splitStack(entityId, 0, 1, 1)).toEqual({
        ok: false,
        reason: "not_stackable",
      });
    });

    it("fails on empty source or invalid positions", () => {
      expect(manager.splitStack(entityId, 0, 1, 1)).toEqual({
        ok: false,
        reason: "entry_not_found",
      });
      expect(manager.splitStack(entityId, 0, 0, 1)).toEqual({
        ok: false,
        reason: "invalid_position",
      });
      expect(manager.splitStack(entityId, -1, 1, 1)).toEqual({
        ok: false,
        reason: "invalid_position",
      });
    });

    it("conserves quantity through split and merge cycles", () => {
      manager.addQuantity(entityId, "RESOURCE_WOOD", 10);
      manager.splitStack(entityId, 0, 1, 3);
      manager.splitStack(entityId, 1, 2, 1);
      manager.mergeStacks(entityId, 2, 0);
      manager.mergeStacks(entityId, 1, 0);
      expect(manager.getTotalQuantity(entityId, "RESOURCE_WOOD")).toBe(10);
      expect(manager.validateIntegrity(entityId)).toEqual([]);
    });
  });

  describe("validation", () => {
    it("flags quantities above maxStack and non-stackable quantities above 1", () => {
      manager.addQuantity(entityId, "RESOURCE_ORE", 3, {
        itemId: "RESOURCE_ORE",
        stackable: true,
        maxStack: 99,
      });
      manager.addQuantity(entityId, "RESOURCE_ORE", 99, {
        itemId: "RESOURCE_ORE",
        stackable: true,
        maxStack: 99,
      });
      const errors = manager.validateIntegrity(entityId);
      expect(errors.some((error) => error.includes("exceeds max stack"))).toBe(true);
    });
  });
});

describe("InventorySaveProvider with stacks", () => {
  it("roundtrips exact quantities and positions without merging stacks", () => {
    const world = createTestWorld();
    const manager = new InventoryManager(world, resolver);
    const provider = new InventorySaveProvider(manager, world);
    const entityId = world.createEntity();
    manager.createInventory(entityId, 5);
    manager.addQuantity(entityId, "RESOURCE_WOOD", 10);
    manager.splitStack(entityId, 0, 3, 4);
    manager.addQuantity(entityId, "RESOURCE_ORE", 5);
    manager.addQuantity(entityId, "EQUIPMENT_SWORD", 1);

    const saved = JSON.parse(JSON.stringify(provider.save())) as unknown;

    const world2 = createTestWorld();
    const manager2 = new InventoryManager(world2, resolver);
    const provider2 = new InventorySaveProvider(manager2, world2);
    provider2.load(saved);

    const restored = manager2.listInventories()[0]!;
    expect(manager2.listSlots(restored)).toEqual(manager.listSlots(entityId));
    expect(manager2.getTotalQuantity(restored, "RESOURCE_WOOD")).toBe(10);
    expect(manager2.getTotalQuantity(restored, "RESOURCE_ORE")).toBe(5);
    expect(manager2.validateIntegrity(restored)).toEqual([]);
    const slots = manager2.findEntriesByItemId(restored, "RESOURCE_WOOD");
    expect(slots.map((slot) => slot.entry?.quantity)).toEqual([6, 4]);
  });

  it("rejects saved stacks exceeding maxStack when a resolver is present", () => {
    const world = createTestWorld();
    const manager = new InventoryManager(world, resolver);
    const provider = new InventorySaveProvider(manager, world);
    const corrupted = {
      inventories: [
        {
          capacity: 3,
          nextInstanceCounter: 1,
          slots: [{ position: 0, instanceId: "item_0", itemId: "RESOURCE_ORE", quantity: 6 }],
        },
      ],
    };
    expect(() => provider.load(corrupted)).toThrow(/exceeds max stack/);
  });

  it("rejects saved entries with quantity below 1", () => {
    const world = createTestWorld();
    const manager = new InventoryManager(world);
    const provider = new InventorySaveProvider(manager, world);
    const corrupted = {
      inventories: [
        {
          capacity: 3,
          nextInstanceCounter: 1,
          slots: [{ position: 0, instanceId: "item_0", itemId: "RESOURCE_ORE", quantity: 0 }],
        },
      ],
    };
    expect(() => provider.load(corrupted)).toThrow(/invalid quantity/);
  });
});
