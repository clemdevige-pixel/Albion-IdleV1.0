import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { InventoryManager, RefiningManager } from "@game/gameplay";
import { createAtomicProductionInventoryManager } from "./AtomicProductionInventory.js";
import { RefiningRuntime } from "./RefiningRuntime.js";

function setupInstantRefining(tier: 3 | 4 = 3) {
  const world = new World(createRuntimeServices());
  const storageId = world.createEntity();
  const baseInventoryManager = new InventoryManager(world, () => undefined);
  baseInventoryManager.createInventory(storageId, 16);
  const inventoryManager = createAtomicProductionInventoryManager(baseInventoryManager);
  const runtime = new RefiningRuntime({
    refiningManagers: {
      Wood: new RefiningManager(),
      Ore: new RefiningManager(),
      Hide: new RefiningManager(),
      Fiber: new RefiningManager(),
    },
    inventoryManager,
    productionStorageId: storageId,
    getProductionTier: () => tier,
    isInstantRefiningUnlocked: () => true,
  });
  return { storageId, inventoryManager, runtime };
}

describe("instant refining research", () => {
  it("converts every payable T3 cycle atomically without starting a refining session", () => {
    const env = setupInstantRefining(3);
    env.inventoryManager.addQuantity(env.storageId, "item_resource_wood_t3", 12, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });

    const result = env.runtime.toggleRefiningFamily("Wood", 0);

    expect(result).toMatchObject({ action: "completed", cycles: 3 });
    expect(env.runtime.isRefiningActive("Wood")).toBe(false);
    expect(env.inventoryManager.getTotalQuantity(env.storageId, "item_resource_wood_t3")).toBe(0);
    expect(env.inventoryManager.getTotalQuantity(env.storageId, "item_refined_planks_t3")).toBe(3);
  });

  it("refines only the requested number of payable cycles", () => {
    const env = setupInstantRefining(3);
    env.inventoryManager.addQuantity(env.storageId, "item_resource_wood_t3", 12, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });

    const result = env.runtime.toggleRefiningFamily("Wood", 0, 1);

    expect(result).toMatchObject({ action: "completed", cycles: 1 });
    expect(env.inventoryManager.getTotalQuantity(env.storageId, "item_resource_wood_t3")).toBe(8);
    expect(env.inventoryManager.getTotalQuantity(env.storageId, "item_refined_planks_t3")).toBe(1);
  });

  it("clamps a requested instant batch to the cycles actually payable", () => {
    const env = setupInstantRefining(3);
    env.inventoryManager.addQuantity(env.storageId, "item_resource_wood_t3", 8, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });

    const result = env.runtime.toggleRefiningFamily("Wood", 0, 99);

    expect(result).toMatchObject({ action: "completed", cycles: 2 });
    expect(env.inventoryManager.getTotalQuantity(env.storageId, "item_resource_wood_t3")).toBe(0);
    expect(env.inventoryManager.getTotalQuantity(env.storageId, "item_refined_planks_t3")).toBe(2);
  });

  it("rejects invalid instant cycle quotas without consuming resources", () => {
    const env = setupInstantRefining(3);
    env.inventoryManager.addQuantity(env.storageId, "item_resource_wood_t3", 8, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });

    expect(env.runtime.toggleRefiningFamily("Wood", 0, 0).action).toBe("failed");
    expect(env.runtime.toggleRefiningFamily("Wood", 0, 1.5).action).toBe("failed");
    expect(env.inventoryManager.getTotalQuantity(env.storageId, "item_resource_wood_t3")).toBe(8);
    expect(env.inventoryManager.getTotalQuantity(env.storageId, "item_refined_planks_t3")).toBe(0);
  });

  it("preserves the Tn-1 prerequisite ratio when refining T4 instantly", () => {
    const env = setupInstantRefining(4);
    env.inventoryManager.addQuantity(env.storageId, "item_resource_wood_t4", 10, {
      itemId: "item_resource_wood_t4",
      stackable: true,
      maxStack: 999,
    });
    env.inventoryManager.addQuantity(env.storageId, "item_refined_planks_t3", 3, {
      itemId: "item_refined_planks_t3",
      stackable: true,
      maxStack: 999,
    });

    const result = env.runtime.toggleRefiningFamily("Wood", 0);

    expect(result).toMatchObject({ action: "completed", cycles: 3 });
    expect(env.inventoryManager.getTotalQuantity(env.storageId, "item_resource_wood_t4")).toBe(4);
    expect(env.inventoryManager.getTotalQuantity(env.storageId, "item_refined_planks_t3")).toBe(0);
    expect(env.inventoryManager.getTotalQuantity(env.storageId, "item_refined_planks_t4")).toBe(3);
  });

  it("applies a T4 quota to both raw and predecessor requirements", () => {
    const env = setupInstantRefining(4);
    env.inventoryManager.addQuantity(env.storageId, "item_resource_wood_t4", 10, {
      itemId: "item_resource_wood_t4",
      stackable: true,
      maxStack: 999,
    });
    env.inventoryManager.addQuantity(env.storageId, "item_refined_planks_t3", 3, {
      itemId: "item_refined_planks_t3",
      stackable: true,
      maxStack: 999,
    });

    const result = env.runtime.toggleRefiningFamily("Wood", 0, 2);

    expect(result).toMatchObject({ action: "completed", cycles: 2 });
    expect(env.inventoryManager.getTotalQuantity(env.storageId, "item_resource_wood_t4")).toBe(6);
    expect(env.inventoryManager.getTotalQuantity(env.storageId, "item_refined_planks_t3")).toBe(1);
    expect(env.inventoryManager.getTotalQuantity(env.storageId, "item_refined_planks_t4")).toBe(2);
  });

  it("keeps the timed refining behavior while the research is locked", () => {
    const world = new World(createRuntimeServices());
    const storageId = world.createEntity();
    const inventoryManager = new InventoryManager(world, () => undefined);
    inventoryManager.createInventory(storageId, 16);
    const runtime = new RefiningRuntime({
      refiningManagers: {
        Wood: new RefiningManager(),
        Ore: new RefiningManager(),
        Hide: new RefiningManager(),
        Fiber: new RefiningManager(),
      },
      inventoryManager,
      productionStorageId: storageId,
      getProductionTier: () => 3,
      isInstantRefiningUnlocked: () => false,
    });
    inventoryManager.addQuantity(storageId, "item_resource_wood_t3", 4, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });

    expect(runtime.toggleRefiningFamily("Wood", 0, 1).action).toBe("started");
    expect(runtime.isRefiningActive("Wood")).toBe(true);
  });
});
