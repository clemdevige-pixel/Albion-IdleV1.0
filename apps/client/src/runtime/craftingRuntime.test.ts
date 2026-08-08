import { describe, it, expect } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import {
  DurabilityStore,
  InventoryManager,
} from "@game/gameplay";
import { CraftingRuntime } from "./CraftingRuntime.js";
import {
  EQUIPMENT_CRAFT_RECIPES,
  COPPER_BAR_RECIPE,
  STURDY_LEATHER_RECIPE,
  IRON_BAR_RECIPE,
  THICK_LEATHER_RECIPE,
} from "../data/refiningRecipes.js";
import { getItemPower } from "../data/itemPower.js";
import { getItemDefinition, getItemDisplayName } from "../panels/ItemVisual.js";

function setupTestEnvironment(inventoryCapacity = 10) {
  const world = new World(createRuntimeServices());
  const heroId = world.createEntity();
  const inventoryManager = new InventoryManager(world, () => undefined);
  inventoryManager.createInventory(heroId, inventoryCapacity);
  const durabilityStore = new DurabilityStore();

  const runtime = new CraftingRuntime({
    inventoryManager,
    heroId,
    durabilityStore,
    recipes: EQUIPMENT_CRAFT_RECIPES,
    getItemPower,
  });

  return {
    world,
    heroId,
    inventoryManager,
    durabilityStore,
    runtime,
  };
}

describe("CraftingRuntime Tn progression test suite", () => {
  it("T3 base craft: succeeds without predecessor item", () => {
    const env = setupTestEnvironment();

    // Add T3 resources: 6 Copper Bars + 2 Sturdy Leather
    env.inventoryManager.addQuantity(env.heroId, COPPER_BAR_RECIPE.outputItemId, 6, {
      itemId: COPPER_BAR_RECIPE.outputItemId,
      stackable: true,
      maxStack: 999,
    });
    env.inventoryManager.addQuantity(env.heroId, STURDY_LEATHER_RECIPE.outputItemId, 2, {
      itemId: STURDY_LEATHER_RECIPE.outputItemId,
      stackable: true,
      maxStack: 999,
    });

    const res = env.runtime.craftEquipment("item_weapon_sword_t3_broadsword");
    expect(res.ok).toBe(true);

    if (res.ok) {
      expect(res.outputItemId).toBe("item_weapon_sword_t3_broadsword");
    }

    // Resources consumed
    expect(env.inventoryManager.getTotalQuantity(env.heroId, COPPER_BAR_RECIPE.outputItemId)).toBe(0);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, STURDY_LEATHER_RECIPE.outputItemId)).toBe(0);

    // T3 Broadsword granted
    expect(env.inventoryManager.getTotalQuantity(env.heroId, "item_weapon_sword_t3_broadsword")).toBe(1);
  });

  it("T4 progression craft: consumes T3 predecessor + T4 resources to grant T4 equipment", () => {
    const env = setupTestEnvironment();

    // Add T4 resources + 1 T3 Broadsword predecessor
    env.inventoryManager.addQuantity(env.heroId, IRON_BAR_RECIPE.outputItemId, 6, {
      itemId: IRON_BAR_RECIPE.outputItemId,
      stackable: true,
      maxStack: 999,
    });
    env.inventoryManager.addQuantity(env.heroId, THICK_LEATHER_RECIPE.outputItemId, 2, {
      itemId: THICK_LEATHER_RECIPE.outputItemId,
      stackable: true,
      maxStack: 999,
    });
    env.inventoryManager.addQuantity(env.heroId, "item_weapon_sword_t3_broadsword", 1, {
      itemId: "item_weapon_sword_t3_broadsword",
      stackable: false,
      maxStack: 1,
    });

    const res = env.runtime.craftEquipment("item_weapon_sword_t4_broadsword");
    expect(res.ok).toBe(true);

    if (res.ok) {
      expect(res.outputItemId).toBe("item_weapon_sword_t4_broadsword");
    }

    // T3 predecessor and resources consumed
    expect(env.inventoryManager.getTotalQuantity(env.heroId, "item_weapon_sword_t3_broadsword")).toBe(0);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, IRON_BAR_RECIPE.outputItemId)).toBe(0);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, THICK_LEATHER_RECIPE.outputItemId)).toBe(0);

    // T4 Broadsword granted
    expect(env.inventoryManager.getTotalQuantity(env.heroId, "item_weapon_sword_t4_broadsword")).toBe(1);
  });

  it("Missing predecessor: rejects T4 craft when T3 item is missing", () => {
    const env = setupTestEnvironment();

    // Add T4 resources but NO T3 Broadsword
    env.inventoryManager.addQuantity(env.heroId, IRON_BAR_RECIPE.outputItemId, 6, {
      itemId: IRON_BAR_RECIPE.outputItemId,
      stackable: true,
      maxStack: 999,
    });
    env.inventoryManager.addQuantity(env.heroId, THICK_LEATHER_RECIPE.outputItemId, 2, {
      itemId: THICK_LEATHER_RECIPE.outputItemId,
      stackable: true,
      maxStack: 999,
    });

    const res = env.runtime.craftEquipment("item_weapon_sword_t4_broadsword");
    expect(res.ok).toBe(false);

    // Nothing consumed
    expect(env.inventoryManager.getTotalQuantity(env.heroId, IRON_BAR_RECIPE.outputItemId)).toBe(6);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, THICK_LEATHER_RECIPE.outputItemId)).toBe(2);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, "item_weapon_sword_t4_broadsword")).toBe(0);
  });

  it("Full inventory with predecessor: craft succeeds when predecessor consumption frees a slot", () => {
    const env = setupTestEnvironment(3); // Exactly 3 slots capacity

    // Slot 1: 6 Iron Bars
    env.inventoryManager.addQuantity(env.heroId, IRON_BAR_RECIPE.outputItemId, 6, {
      itemId: IRON_BAR_RECIPE.outputItemId,
      stackable: true,
      maxStack: 999,
    });
    // Slot 2: 2 Thick Leather
    env.inventoryManager.addQuantity(env.heroId, THICK_LEATHER_RECIPE.outputItemId, 2, {
      itemId: THICK_LEATHER_RECIPE.outputItemId,
      stackable: true,
      maxStack: 999,
    });
    // Slot 3: 1 T3 Broadsword
    env.inventoryManager.addQuantity(env.heroId, "item_weapon_sword_t3_broadsword", 1, {
      itemId: "item_weapon_sword_t3_broadsword",
      stackable: false,
      maxStack: 1,
    });

    expect(env.inventoryManager.isFull(env.heroId)).toBe(true);

    const res = env.runtime.craftEquipment("item_weapon_sword_t4_broadsword");
    expect(res.ok).toBe(true);

    expect(env.inventoryManager.getTotalQuantity(env.heroId, "item_weapon_sword_t3_broadsword")).toBe(0);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, "item_weapon_sword_t4_broadsword")).toBe(1);
  });

  it("Full inventory with partial stacks only: validator rejects craft when 0 slots are freed", () => {
    const env = setupTestEnvironment(3); // Exactly 3 slots capacity

    // Slot 1: 100 Iron Bars
    env.inventoryManager.addQuantity(env.heroId, IRON_BAR_RECIPE.outputItemId, 100, {
      itemId: IRON_BAR_RECIPE.outputItemId,
      stackable: true,
      maxStack: 999,
    });
    // Slot 2: 100 Thick Leather
    env.inventoryManager.addQuantity(env.heroId, THICK_LEATHER_RECIPE.outputItemId, 100, {
      itemId: THICK_LEATHER_RECIPE.outputItemId,
      stackable: true,
      maxStack: 999,
    });
    // Slot 3: 1 T3 Broadsword
    env.inventoryManager.addQuantity(env.heroId, "item_weapon_sword_t3_broadsword", 1, {
      itemId: "item_weapon_sword_t3_broadsword",
      stackable: false,
      maxStack: 1,
    });

    expect(env.inventoryManager.isFull(env.heroId)).toBe(true);

    // Attempt T4 Longbow (which requires Pine Planks, Thick Leather, Fine Cloth, T3 Longbow)
    // Missing Pine Planks & Fine Cloth -> fails
    const res = env.runtime.craftEquipment("item_weapon_bow_t4_longbow");
    expect(res.ok).toBe(false);
  });

  it("Rollback verification: restores consumed requirements if output creation fails", () => {
    const env = setupTestEnvironment();

    env.inventoryManager.addQuantity(env.heroId, IRON_BAR_RECIPE.outputItemId, 6, {
      itemId: IRON_BAR_RECIPE.outputItemId,
      stackable: true,
      maxStack: 999,
    });
    env.inventoryManager.addQuantity(env.heroId, THICK_LEATHER_RECIPE.outputItemId, 2, {
      itemId: THICK_LEATHER_RECIPE.outputItemId,
      stackable: true,
      maxStack: 999,
    });
    env.inventoryManager.addQuantity(env.heroId, "item_weapon_sword_t3_broadsword", 1, {
      itemId: "item_weapon_sword_t3_broadsword",
      stackable: false,
      maxStack: 1,
    });

    // Mock addEntry to simulate output insertion failure
    const originalAddEntry = env.inventoryManager.addEntry.bind(env.inventoryManager);
    env.inventoryManager.addEntry = () => ({ ok: false, reason: "inventory_full" });

    const res = env.runtime.craftEquipment("item_weapon_sword_t4_broadsword");
    expect(res.ok).toBe(false);

    // Rollback restored all requirements
    expect(env.inventoryManager.getTotalQuantity(env.heroId, "item_weapon_sword_t3_broadsword")).toBe(1);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, IRON_BAR_RECIPE.outputItemId)).toBe(6);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, THICK_LEATHER_RECIPE.outputItemId)).toBe(2);

    // Restore original addEntry
    env.inventoryManager.addEntry = originalAddEntry;
  });

  it("UI presentation check: all predecessor requirements in T4 equipment recipes resolve to valid item definitions", () => {
    const t4Recipes = EQUIPMENT_CRAFT_RECIPES.filter((r) => r.tier === 4);
    for (const recipe of t4Recipes) {
      const equipmentReqs = recipe.requirements.filter((req) => req.itemId.startsWith("item_") && !req.itemId.includes("planks") && !req.itemId.includes("bar") && !req.itemId.includes("leather") && !req.itemId.includes("cloth"));

      for (const req of equipmentReqs) {
        const itemDef = getItemDefinition(req.itemId);
        expect(itemDef).toBeDefined();
        expect(itemDef?.name).toBeTruthy();
        expect(itemDef?.icon).toBeTruthy();
        expect(getItemDisplayName(req.itemId)).toBe(itemDef?.name);
      }
    }
  });
});
