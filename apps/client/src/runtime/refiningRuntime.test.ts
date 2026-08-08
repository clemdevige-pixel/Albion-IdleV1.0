import { describe, it, expect } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import {
  InventoryManager,
  RefiningManager,
} from "@game/gameplay";
import { RefiningRuntime } from "./RefiningRuntime.js";

function setupTestEnvironment(inventoryCapacity = 10) {
  const world = new World(createRuntimeServices());
  const heroId = world.createEntity();

  const inventoryManager = new InventoryManager(world, () => undefined);
  inventoryManager.createInventory(heroId, inventoryCapacity);

  const refiningManager = new RefiningManager();
  const metalRefiningManager = new RefiningManager();
  const leatherRefiningManager = new RefiningManager();
  const clothRefiningManager = new RefiningManager();

  let productionTier: 3 | 4 = 3;

  const runtime = new RefiningRuntime({
    refiningManager,
    metalRefiningManager,
    leatherRefiningManager,
    clothRefiningManager,
    inventoryManager,
    heroId,
    getProductionTier: () => productionTier,
  });

  return {
    world,
    heroId,
    inventoryManager,
    refiningManager,
    runtime,
    setProductionTier: (tier: 3 | 4) => {
      productionTier = tier;
    },
  };
}

describe("RefiningRuntime regression suite", () => {
  it("output insertion failure (full inventory): refunds inputs, stops auto-refining, clears session", () => {
    // Inventory capacity = 2 slots
    const env = setupTestEnvironment(2);

    // Slot 1: 5 T3 Wood logs (4 will be reserved, 1 remains in slot 1 so slot 1 stays occupied by wood)
    env.inventoryManager.addQuantity(env.heroId, "item_resource_wood_t3", 5, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });
    // Slot 2: Non-stackable filler item occupying the only other slot
    env.inventoryManager.addQuantity(env.heroId, "filler_item", 1, {
      itemId: "filler_item",
      stackable: false,
      maxStack: 1,
    });

    // Verify 0 free slots remain
    expect(env.inventoryManager.findFreeSlots(env.heroId).length).toBe(0);

    // Start refining
    const startRes = env.runtime.toggleRefining(0);
    expect(startRes.action).toBe("started");
    expect(env.runtime.isRefiningActive("Wood")).toBe(true);

    // Tick refining to completion (T3 Wood takes 6 ticks)
    for (let tick = 1; tick <= 6; tick++) {
      env.runtime.tick(tick);
    }

    // Output addition should fail due to full inventory.
    // 1. Reserved inputs (4 T3 logs) are refunded into slot 1 (total 5 logs again).
    expect(
      env.inventoryManager.getTotalQuantity(
        env.heroId,
        "item_resource_wood_t3",
      ),
    ).toBe(5);

    // 2. Output plank was NOT added
    expect(
      env.inventoryManager.getTotalQuantity(
        env.heroId,
        "item_refined_planks_t3",
      ),
    ).toBe(0);

    // 3. Auto-refining STOPPED, active session CLEARED, runtime in clean idle state
    expect(env.runtime.isRefiningActive("Wood")).toBe(false);
  });

  it("successful refining: consumes inputs, adds output, clears session", () => {
    const env = setupTestEnvironment(10);

    // Add 4 T3 Wood logs (enough for 1 cycle)
    env.inventoryManager.addQuantity(env.heroId, "item_resource_wood_t3", 4, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });

    // Start refining
    const startRes = env.runtime.toggleRefining(0);
    expect(startRes.action).toBe("started");

    // Tick to completion
    for (let tick = 1; tick <= 6; tick++) {
      env.runtime.tick(tick);
    }

    // Raw logs consumed
    expect(
      env.inventoryManager.getTotalQuantity(
        env.heroId,
        "item_resource_wood_t3",
      ),
    ).toBe(0);

    // Output plank added
    expect(
      env.inventoryManager.getTotalQuantity(
        env.heroId,
        "item_refined_planks_t3",
      ),
    ).toBe(1);

    // Session cleared
    expect(env.runtime.isRefiningActive("Wood")).toBe(false);
  });

  it("automatic chaining: continues while ingredients remain and stops when exhausted", () => {
    const env = setupTestEnvironment(10);

    // Add 8 T3 Wood logs (enough for 2 cycles)
    env.inventoryManager.addQuantity(env.heroId, "item_resource_wood_t3", 8, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });

    // Start auto-refining
    env.runtime.toggleRefining(0);

    // First cycle ticks (ticks 1..6)
    for (let tick = 1; tick <= 6; tick++) {
      env.runtime.tick(tick);
    }

    // First output plank added, 4 logs remaining reserved for second cycle
    expect(
      env.inventoryManager.getTotalQuantity(
        env.heroId,
        "item_refined_planks_t3",
      ),
    ).toBe(1);
    expect(env.runtime.isRefiningActive("Wood")).toBe(true);

    // Second cycle ticks (ticks 7..12)
    for (let tick = 7; tick <= 12; tick++) {
      env.runtime.tick(tick);
    }

    // Second output plank added
    expect(
      env.inventoryManager.getTotalQuantity(
        env.heroId,
        "item_refined_planks_t3",
      ),
    ).toBe(2);

    // Ingredients exhausted -> auto-refining stops naturally
    expect(env.runtime.isRefiningActive("Wood")).toBe(false);
  });

  it("T4 prerequisite requirement: fails to start when required T3 component is missing", () => {
    const env = setupTestEnvironment(10);
    env.setProductionTier(4);

    // Add 2 T4 Wood logs, but 0 T3 refined planks
    env.inventoryManager.addQuantity(env.heroId, "item_resource_wood_t4", 2, {
      itemId: "item_resource_wood_t4",
      stackable: true,
      maxStack: 999,
    });

    // Toggle T4 refining
    const startRes = env.runtime.toggleRefining(0);

    // Fails to start because T3 refined plank requirement is missing
    expect(startRes.action).toBe("failed");
    expect(env.runtime.isRefiningActive("Wood")).toBe(false);
  });
});
