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

  it("returns false when the entity inventory is full", () => {
    const { inventoryManager, entityId } = setupTestWorld();
    inventoryManager.createInventory(entityId, 2);

    inventoryManager.addEntry(entityId, "item_wood_t3");
    inventoryManager.addEntry(entityId, "item_ore_t3");

    expect(inventoryManager.isFull(entityId)).toBe(true);

    const requirements = [
      { itemId: "item_wood_t3", quantity: 1 },
      { itemId: "item_ore_t3", quantity: 1 },
    ];

    expect(canCraftRecipe(inventoryManager, entityId, requirements)).toBe(false);
  });
});
