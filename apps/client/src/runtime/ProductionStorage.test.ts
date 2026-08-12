import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { InventoryManager } from "@game/gameplay";
import { resolveItemStackInfo } from "../data/itemContentCatalog.js";
import {
  isProductionMaterial,
  isVisibleInventoryResource,
  migrateLegacyProductionMaterials,
} from "./ProductionStorage.js";

describe("production storage migration", () => {
  it("removes legacy raw/refined materials from hero slots without hiding item entries", () => {
    const world = new World(createRuntimeServices());
    const heroId = world.createEntity();
    const productionStorageId = world.createEntity();
    const inventoryManager = new InventoryManager(world, resolveItemStackInfo);
    inventoryManager.createInventory(heroId, 4);
    inventoryManager.createInventory(productionStorageId, 16);

    inventoryManager.addQuantity(heroId, "item_resource_wood_t3", 8);
    inventoryManager.addQuantity(heroId, "item_refined_planks_t3", 3);
    inventoryManager.addQuantity(heroId, "item_weapon_sword_t3_broadsword", 1);

    expect(inventoryManager.getOccupiedCount(heroId)).toBe(3);
    expect(migrateLegacyProductionMaterials(
      inventoryManager,
      heroId,
      productionStorageId,
    )).toBe(11);

    expect(inventoryManager.getOccupiedCount(heroId)).toBe(1);
    expect(
      inventoryManager.listSlots(heroId)
        .flatMap((slot) => slot.entry === undefined ? [] : [slot.entry.itemId])
        .some(isProductionMaterial),
    ).toBe(false);
    expect(inventoryManager.getTotalQuantity(productionStorageId, "item_resource_wood_t3")).toBe(8);
    expect(inventoryManager.getTotalQuantity(productionStorageId, "item_refined_planks_t3")).toBe(3);
  });

  it("does not classify visible enchantment currencies as production materials", () => {
    expect(isProductionMaterial("item_resource_enchantment_essence")).toBe(false);
    expect(isProductionMaterial("item_resource_arcane_crystal")).toBe(false);
    expect(isProductionMaterial("item_resource_enchantment_catalyst")).toBe(false);
  });

  it("keeps faction key and artifact loot in the hero inventory during load migration", () => {
    const factionLoot = [
      "item_resource_key_fragment_morgana",
      "item_resource_dungeon_key_morgana",
      "item_resource_artifact_fragment_morgana",
      "item_resource_artifact_morgana",
      "item_resource_key_fragment_undead",
      "item_resource_artifact_fragment_keeper",
    ];

    for (const itemId of factionLoot) {
      expect(isVisibleInventoryResource(itemId)).toBe(true);
      expect(isProductionMaterial(itemId)).toBe(false);
    }

    const world = new World(createRuntimeServices());
    const heroId = world.createEntity();
    const productionStorageId = world.createEntity();
    const inventoryManager = new InventoryManager(world, resolveItemStackInfo);
    inventoryManager.createInventory(heroId, 12);
    inventoryManager.createInventory(productionStorageId, 16);

    inventoryManager.addQuantity(heroId, "item_resource_key_fragment_morgana", 17);
    inventoryManager.addQuantity(heroId, "item_resource_artifact_fragment_morgana", 9);

    expect(migrateLegacyProductionMaterials(
      inventoryManager,
      heroId,
      productionStorageId,
    )).toBe(0);
    expect(inventoryManager.getTotalQuantity(heroId, "item_resource_key_fragment_morgana")).toBe(17);
    expect(inventoryManager.getTotalQuantity(heroId, "item_resource_artifact_fragment_morgana")).toBe(9);
    expect(inventoryManager.getTotalQuantity(productionStorageId, "item_resource_key_fragment_morgana")).toBe(0);
  });
});
