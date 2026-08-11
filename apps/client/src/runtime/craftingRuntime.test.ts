import { describe, it, expect } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import {
  canCraftRecipe,
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
import { resolveItemStackInfo } from "../data/itemContentCatalog.js";
import { getItemDefinition, getItemDisplayName } from "../panels/ItemVisual.js";
import { isProductionMaterial } from "./ProductionStorage.js";

function setupTestEnvironment(inventoryCapacity = 10) {
  const world = new World(createRuntimeServices());
  const heroId = world.createEntity();
  const inventoryManager = new InventoryManager(world, resolveItemStackInfo);
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

  it("T3 repeated craft: remains craftable and stacks identical equipment", () => {
    const env = setupTestEnvironment();
    const recipe = EQUIPMENT_CRAFT_RECIPES.find(
      (entry) => entry.outputItemId === "item_shield_t3_reinforced",
    );
    expect(recipe).toBeDefined();
    if (recipe === undefined) return;

    for (const requirement of recipe.requirements) {
      env.inventoryManager.addQuantity(
        env.heroId,
        requirement.itemId,
        requirement.quantity * 2,
        { itemId: requirement.itemId, stackable: true, maxStack: 999 },
      );
    }

    const output = { itemId: recipe.outputItemId, quantity: 1 } as const;
    expect(canCraftRecipe(env.inventoryManager, env.heroId, recipe.requirements, output)).toBe(true);
    expect(env.runtime.craftEquipment(recipe.outputItemId).ok).toBe(true);
    expect(canCraftRecipe(env.inventoryManager, env.heroId, recipe.requirements, output)).toBe(true);
    expect(env.runtime.craftEquipment(recipe.outputItemId).ok).toBe(true);

    const crafted = env.inventoryManager.findEntriesByItemId(env.heroId, recipe.outputItemId);
    const craftedEntries = crafted.flatMap((slot) => slot.entry === undefined ? [] : [slot.entry]);
    expect(craftedEntries).toHaveLength(1);
    expect(craftedEntries[0]?.quantity).toBe(2);
    expect(env.inventoryManager.getOccupiedCount(env.heroId)).toBe(1);

    for (const requirement of recipe.requirements) {
      expect(env.inventoryManager.getTotalQuantity(env.heroId, requirement.itemId)).toBe(0);
    }
  });

  it("full inventory remains craftable when the result fits an existing compatible stack", () => {
    const env = setupTestEnvironment(4);
    const recipe = EQUIPMENT_CRAFT_RECIPES.find(
      (entry) => entry.outputItemId === "item_shield_t3_reinforced",
    );
    expect(recipe).toBeDefined();
    if (recipe === undefined) return;

    for (const requirement of recipe.requirements) {
      env.inventoryManager.addQuantity(
        env.heroId,
        requirement.itemId,
        requirement.quantity * 2,
        { itemId: requirement.itemId, stackable: true, maxStack: 999 },
      );
    }
    env.inventoryManager.addQuantity(env.heroId, recipe.outputItemId, 1);

    expect(env.inventoryManager.isFull(env.heroId)).toBe(true);
    for (const requirement of recipe.requirements) {
      expect(env.inventoryManager.getTotalQuantity(env.heroId, requirement.itemId)).toBe(
        requirement.quantity * 2,
      );
    }
    expect(env.inventoryManager.canAcceptQuantity(
      env.heroId,
      recipe.outputItemId,
      1,
    )).toBe(true);
    expect(canCraftRecipe(env.inventoryManager, env.heroId, recipe.requirements, {
      itemId: recipe.outputItemId,
      quantity: 1,
    })).toBe(true);
    expect(env.runtime.craftEquipment(recipe.outputItemId).ok).toBe(true);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, recipe.outputItemId)).toBe(2);
    expect(env.inventoryManager.getOccupiedCount(env.heroId)).toBe(4);
  });

  it("keeps incompatible crafted variants in separate stacks", () => {
    const env = setupTestEnvironment();
    const itemId = "item_shield_t3_reinforced";

    expect(env.inventoryManager.addQuantity(env.heroId, itemId, 2, undefined, 0).ok).toBe(true);
    expect(env.inventoryManager.addQuantity(env.heroId, itemId, 1, undefined, 1).ok).toBe(true);

    const stacks = env.inventoryManager.findEntriesByItemId(env.heroId, itemId);
    expect(stacks).toHaveLength(2);
    expect(stacks.map((slot) => slot.entry?.enchantment)).toEqual([0, 1]);
    expect(stacks.map((slot) => slot.entry?.quantity)).toEqual([2, 1]);
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

    // Mock output addQuantity only, while keeping requirement rollback available.
    const originalAddQuantity = env.inventoryManager.addQuantity.bind(env.inventoryManager);
    env.inventoryManager.addQuantity = ((entityId, itemId, quantity, stackInfo, enchantment) => {
      if (itemId === "item_weapon_sword_t4_broadsword") {
        return { ok: false, reason: "inventory_full" } as const;
      }
      return originalAddQuantity(entityId, itemId, quantity, stackInfo, enchantment);
    });

    const res = env.runtime.craftEquipment("item_weapon_sword_t4_broadsword");
    expect(res.ok).toBe(false);

    // Rollback restored all requirements
    expect(env.inventoryManager.getTotalQuantity(env.heroId, "item_weapon_sword_t3_broadsword")).toBe(1);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, IRON_BAR_RECIPE.outputItemId)).toBe(6);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, THICK_LEATHER_RECIPE.outputItemId)).toBe(2);

    // Restore original addQuantity
    env.inventoryManager.addQuantity = originalAddQuantity;
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

describe("CraftingRuntime with dedicated production storage", () => {
  it("crafts repeated identical items into one hero slot while materials consume no hero slots", () => {
    const world = new World(createRuntimeServices());
    const heroId = world.createEntity();
    const productionStorageId = world.createEntity();
    const inventoryManager = new InventoryManager(world, resolveItemStackInfo);
    inventoryManager.createInventory(heroId, 2);
    inventoryManager.createInventory(productionStorageId, 32);
    const runtime = new CraftingRuntime({
      inventoryManager,
      heroId,
      productionStorageId,
      durabilityStore: new DurabilityStore(),
      recipes: EQUIPMENT_CRAFT_RECIPES,
      getItemPower,
    });
    const shieldRecipe = EQUIPMENT_CRAFT_RECIPES.find(
      (recipe) => recipe.outputItemId === "item_shield_t3_reinforced",
    );
    expect(shieldRecipe).toBeDefined();
    if (shieldRecipe === undefined) return;

    for (const requirement of shieldRecipe.requirements) {
      const ownerId = isProductionMaterial(requirement.itemId)
        ? productionStorageId
        : heroId;
      inventoryManager.addQuantity(
        ownerId,
        requirement.itemId,
        requirement.quantity * 4,
      );
    }
    expect(inventoryManager.getOccupiedCount(heroId)).toBe(0);

    expect(runtime.craftEquipment(shieldRecipe.outputItemId).ok).toBe(true);
    expect(runtime.craftEquipment(shieldRecipe.outputItemId).ok).toBe(true);
    expect(runtime.craftEquipment(shieldRecipe.outputItemId).ok).toBe(true);
    const shieldEntries = inventoryManager.findEntriesByItemId(heroId, shieldRecipe.outputItemId);
    expect(shieldEntries).toHaveLength(1);
    expect(shieldEntries[0]?.entry?.quantity).toBe(3);
    expect(inventoryManager.getOccupiedCount(heroId)).toBe(1);

    inventoryManager.addQuantity(heroId, "item_health_potion", 1);
    expect(inventoryManager.isFull(heroId)).toBe(true);
    expect(runtime.craftEquipment(shieldRecipe.outputItemId).ok).toBe(true);
    expect(
      inventoryManager.findEntriesByItemId(heroId, shieldRecipe.outputItemId)[0]?.entry?.quantity,
    ).toBe(4);
  });

  it("reports full only when a new output cannot stack and no hero slot is available", () => {
    const world = new World(createRuntimeServices());
    const heroId = world.createEntity();
    const productionStorageId = world.createEntity();
    const inventoryManager = new InventoryManager(world, resolveItemStackInfo);
    inventoryManager.createInventory(heroId, 1);
    inventoryManager.createInventory(productionStorageId, 32);
    const runtime = new CraftingRuntime({
      inventoryManager,
      heroId,
      productionStorageId,
      durabilityStore: new DurabilityStore(),
      recipes: EQUIPMENT_CRAFT_RECIPES,
      getItemPower,
    });
    const swordRecipe = EQUIPMENT_CRAFT_RECIPES.find(
      (recipe) => recipe.outputItemId === "item_weapon_sword_t3_broadsword",
    );
    expect(swordRecipe).toBeDefined();
    if (swordRecipe === undefined) return;

    for (const requirement of swordRecipe.requirements) {
      inventoryManager.addQuantity(
        isProductionMaterial(requirement.itemId) ? productionStorageId : heroId,
        requirement.itemId,
        requirement.quantity,
      );
    }
    inventoryManager.addQuantity(heroId, "item_health_potion", 1);
    expect(runtime.craftEquipment(swordRecipe.outputItemId).ok).toBe(false);

    inventoryManager.removeQuantity(heroId, "item_health_potion", 1);
    expect(runtime.craftEquipment(swordRecipe.outputItemId).ok).toBe(true);
  });
});
