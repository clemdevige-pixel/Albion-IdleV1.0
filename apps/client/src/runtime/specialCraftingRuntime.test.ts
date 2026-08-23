import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { DurabilityStore, InventoryManager } from "@game/gameplay";
import { KEY_FRAGMENTS_PER_KEY, ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE } from "../data/economyContentCatalog.js";
import {
  getDungeonArtifactFragmentItemId,
  getDungeonArtifactItemId,
} from "../data/dungeonArtifactContentCatalog.js";
import {
  getDungeonKeyFragmentItemId,
  getDungeonKeyItemId,
} from "../data/dungeonKeyContentCatalog.js";
import { EQUIPMENT_CRAFT_RECIPES } from "../data/refiningRecipes.js";
import { getItemPower } from "../data/itemPower.js";
import { resolveItemStackInfo } from "../data/itemContentCatalog.js";
import { CraftingRuntime } from "./CraftingRuntime.js";

function createRuntime() {
  const world = new World(createRuntimeServices());
  const heroId = world.createEntity();
  const inventoryManager = new InventoryManager(world, resolveItemStackInfo);
  inventoryManager.createInventory(heroId, 12);
  const runtime = new CraftingRuntime({
    inventoryManager,
    heroId,
    durabilityStore: new DurabilityStore(),
    recipes: EQUIPMENT_CRAFT_RECIPES,
    getItemPower,
  });
  return { heroId, inventoryManager, runtime };
}

describe("Dungeon fragment conversions", () => {
  it("converts 50 T5 key fragments into one T5 dungeon key", () => {
    const env = createRuntime();
    const fragmentId = getDungeonKeyFragmentItemId(5);
    const keyId = getDungeonKeyItemId(5);

    env.inventoryManager.addQuantity(env.heroId, fragmentId, KEY_FRAGMENTS_PER_KEY);
    expect(env.runtime.craftEquipment(keyId).ok).toBe(true);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, fragmentId)).toBe(0);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, keyId)).toBe(1);
  });

  it("converts 200 T7 Keeper artifact fragments into one T7 Keeper artifact", () => {
    const env = createRuntime();
    const fragmentId = getDungeonArtifactFragmentItemId("keeper", 7);
    const artifactId = getDungeonArtifactItemId("keeper", 7);

    env.inventoryManager.addQuantity(
      env.heroId,
      fragmentId,
      ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE,
    );
    expect(env.runtime.craftEquipment(artifactId).ok).toBe(true);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, fragmentId)).toBe(0);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, artifactId)).toBe(1);
  });

  it("rejects conversion when tier-matched fragments are insufficient", () => {
    const env = createRuntime();
    const fragmentId = getDungeonKeyFragmentItemId(8);
    const keyId = getDungeonKeyItemId(8);

    env.inventoryManager.addQuantity(env.heroId, fragmentId, KEY_FRAGMENTS_PER_KEY - 1);
    expect(env.runtime.craftEquipment(keyId).ok).toBe(false);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, fragmentId)).toBe(KEY_FRAGMENTS_PER_KEY - 1);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, keyId)).toBe(0);
  });
});
