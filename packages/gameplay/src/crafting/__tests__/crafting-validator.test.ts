import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { InventoryManager } from "../../inventory/inventory-manager.js";
import { canCraftRecipe } from "../crafting-validator.js";

describe("canCraftRecipe", () => {
  function setupTestWorld() {
    const services = createRuntimeServices();
    const world = new World(services);
    const inventoryManager = new InventoryManager(world);
    const entityId = world.createEntity();
    return { world, inventoryManager, entityId };
  }

  const woodStack = { itemId: "item_wood_t3", stackable: true, maxStack: 999 };
  const oreStack = { itemId: "item_ore_t3", stackable: true, maxStack: 999 };

  it("returns true when entity has enough ingredients and inventory is not full", () => {
    const { inventoryManager, entityId } = setupTestWorld();
    inventoryManager.createInventory(entityId, 5);

    inventoryManager.addQuantity(entityId, "item_wood_t3", 10, woodStack);
    inventoryManager.addQuantity(entityId, "item_ore_t3", 5, oreStack);

    const requirements = [
      { itemId: "item_wood_t3", quantity: 10 },
      { itemId: "item_ore_t3", quantity: 5 },
    ];

    expect(canCraftRecipe(inventoryManager, entityId, requirements)).toBe(true);
  });

  it("returns false when a required ingredient is missing completely", () => {
    const { inventoryManager, entityId } = setupTestWorld();
    inventoryManager.createInventory(entityId, 5);

    inventoryManager.addQuantity(entityId, "item_wood_t3", 10, woodStack);

    const requirements = [
      { itemId: "item_wood_t3", quantity: 10 },
      { itemId: "item_ore_t3", quantity: 5 },
    ];

    expect(canCraftRecipe(inventoryManager, entityId, requirements)).toBe(false);
  });

  it("returns false when an ingredient has insufficient quantity", () => {
    const { inventoryManager, entityId } = setupTestWorld();
    inventoryManager.createInventory(entityId, 5);

    inventoryManager.addQuantity(entityId, "item_wood_t3", 9, woodStack);
    inventoryManager.addQuantity(entityId, "item_ore_t3", 5, oreStack);

    const requirements = [
      { itemId: "item_wood_t3", quantity: 10 },
      { itemId: "item_ore_t3", quantity: 5 },
    ];

    expect(canCraftRecipe(inventoryManager, entityId, requirements)).toBe(false);
  });

  it("returns true when inventory is full but consuming a requirement will completely empty a slot", () => {
    const { inventoryManager, entityId } = setupTestWorld();
    inventoryManager.createInventory(entityId, 2);

    // Slot 0: 100 wood bars (stacked)
    inventoryManager.addQuantity(entityId, "item_wood_t3", 100, woodStack);
    // Slot 1: 1 T3 Broadsword (quantity 1)
    inventoryManager.addQuantity(entityId, "item_sword_t3", 1, { itemId: "item_sword_t3", stackable: false, maxStack: 1 });

    expect(inventoryManager.isFull(entityId)).toBe(true);

    const requirements = [
      { itemId: "item_wood_t3", quantity: 6 },
      { itemId: "item_sword_t3", quantity: 1 },
    ];

    // Removing 1 item_sword_t3 will completely delete slot 1, freeing space for output
    expect(canCraftRecipe(inventoryManager, entityId, requirements)).toBe(true);
  });

  it("returns false when inventory is full and requirement consumption leaves all stacks partially occupied", () => {
    const { inventoryManager, entityId } = setupTestWorld();
    inventoryManager.createInventory(entityId, 2);

    // Slot 0: 100 wood
    inventoryManager.addQuantity(entityId, "item_wood_t3", 100, woodStack);
    // Slot 1: 100 ore
    inventoryManager.addQuantity(entityId, "item_ore_t3", 100, oreStack);

    expect(inventoryManager.isFull(entityId)).toBe(true);

    const requirements = [
      { itemId: "item_wood_t3", quantity: 6 },
      { itemId: "item_ore_t3", quantity: 2 },
    ];

    // Consuming 6 wood and 2 ore leaves 94 wood and 98 ore, so 0 slots are freed
    expect(canCraftRecipe(inventoryManager, entityId, requirements)).toBe(false);
  });

  it("accepts a craft in a full inventory when its output can merge", () => {
    const services = createRuntimeServices();
    const world = new World(services);
    const stackInfo = (itemId: string) => ({ itemId, stackable: true, maxStack: 20 });
    const inventoryManager = new InventoryManager(world, stackInfo);
    const entityId = world.createEntity();
    inventoryManager.createInventory(entityId, 2);
    inventoryManager.addQuantity(entityId, "material", 10);
    inventoryManager.addQuantity(entityId, "crafted_shield", 1);

    expect(inventoryManager.isFull(entityId)).toBe(true);
    expect(canCraftRecipe(
      inventoryManager,
      entityId,
      [{ itemId: "material", quantity: 1 }],
      { itemId: "crafted_shield", quantity: 1 },
    )).toBe(true);
  });

  it("rejects a craft in a genuinely full inventory with no compatible output stack", () => {
    const services = createRuntimeServices();
    const world = new World(services);
    const stackInfo = (itemId: string) => ({ itemId, stackable: true, maxStack: 20 });
    const inventoryManager = new InventoryManager(world, stackInfo);
    const entityId = world.createEntity();
    inventoryManager.createInventory(entityId, 2);
    inventoryManager.addQuantity(entityId, "material", 10);
    inventoryManager.addQuantity(entityId, "filler", 1);

    expect(canCraftRecipe(
      inventoryManager,
      entityId,
      [{ itemId: "material", quantity: 1 }],
      { itemId: "crafted_shield", quantity: 1 },
    )).toBe(false);
  });
});
