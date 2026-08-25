import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { DurabilityStore } from "@game/gameplay";
import { KEY_FRAGMENTS_PER_KEY } from "../data/economyContentCatalog.js";
import { getDungeonKeyFragmentItemId, getDungeonKeyItemId } from "../data/dungeonKeyContentCatalog.js";
import { EQUIPMENT_CRAFT_RECIPES } from "../data/refiningRecipes.js";
import { getItemPower } from "../data/itemPower.js";
import { resolveItemStackInfo } from "../data/itemContentCatalog.js";
import { CraftingRuntime } from "./CraftingRuntime.js";
import { PlayerInventoryManager } from "./PlayerInventoryManager.js";

describe("CraftingRuntime accessible player storage", () => {
  it("consumes fragment requirements from Bank and stores output in accessible storage", () => {
    const world = new World(createRuntimeServices());
    const heroId = world.createEntity();
    const bankId = world.createEntity();
    const inventoryManager = new PlayerInventoryManager(world, resolveItemStackInfo);
    inventoryManager.createInventory(heroId, 1);
    inventoryManager.createInventory(bankId, 8);
    inventoryManager.setAccessibleStorageOwners(heroId, [heroId, bankId]);
    inventoryManager.addQuantity(heroId, "item_health_potion", 999);

    const fragmentId = getDungeonKeyFragmentItemId(5);
    const keyId = getDungeonKeyItemId(5);
    inventoryManager.addQuantity(bankId, fragmentId, KEY_FRAGMENTS_PER_KEY);

    const runtime = new CraftingRuntime({
      inventoryManager,
      heroId,
      durabilityStore: new DurabilityStore(),
      recipes: EQUIPMENT_CRAFT_RECIPES,
      getItemPower,
    });

    expect(runtime.craftEquipment(keyId).ok).toBe(true);
    expect(inventoryManager.getAccessibleQuantity(heroId, fragmentId)).toBe(0);
    expect(inventoryManager.getTotalQuantity(heroId, keyId)).toBe(0);
    expect(inventoryManager.getTotalQuantity(bankId, keyId)).toBe(1);
  });
});
