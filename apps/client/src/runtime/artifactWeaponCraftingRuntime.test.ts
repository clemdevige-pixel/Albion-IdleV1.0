import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { DurabilityStore, InventoryManager } from "@game/gameplay";
import { ARTIFACT_WEAPON_CRAFT_RECIPES } from "../data/artifactWeaponCraftRecipes.js";
import { ALL_CRAFT_RECIPES } from "../data/specialCraftRecipes.js";
import { getItemPower } from "../data/itemPower.js";
import { resolveItemStackInfo } from "../data/itemContentCatalog.js";
import { isProductionMaterial } from "./ProductionStorage.js";
import { CraftingRuntime } from "./CraftingRuntime.js";

describe("artifact weapon crafting runtime", () => {
  it("crafts an authored artifact weapon through the same canonical catalog as the UI", () => {
    const world = new World(createRuntimeServices());
    const heroId = world.createEntity();
    const productionStorageId = world.createEntity();
    const inventoryManager = new InventoryManager(world, resolveItemStackInfo);
    inventoryManager.createInventory(heroId, 24);
    inventoryManager.createInventory(productionStorageId, 64);

    const recipe = ARTIFACT_WEAPON_CRAFT_RECIPES[0];
    expect(recipe).toBeDefined();
    if (recipe === undefined) throw new Error("Expected at least one artifact weapon recipe");

    for (const requirement of recipe.requirements) {
      const ownerId = isProductionMaterial(requirement.itemId)
        ? productionStorageId
        : heroId;
      const added = inventoryManager.addQuantity(
        ownerId,
        requirement.itemId,
        requirement.quantity,
      );
      expect(added.ok).toBe(true);
    }

    const runtime = new CraftingRuntime({
      inventoryManager,
      heroId,
      productionStorageId,
      durabilityStore: new DurabilityStore(),
      recipes: ALL_CRAFT_RECIPES,
      getItemPower,
    });

    const result = runtime.craftEquipment(recipe.outputItemId);
    expect(result.ok).toBe(true);
    expect(inventoryManager.getTotalQuantity(heroId, recipe.outputItemId)).toBe(1);
    for (const requirement of recipe.requirements) {
      const ownerId = isProductionMaterial(requirement.itemId)
        ? productionStorageId
        : heroId;
      expect(inventoryManager.getTotalQuantity(ownerId, requirement.itemId)).toBe(0);
    }
  });
});
