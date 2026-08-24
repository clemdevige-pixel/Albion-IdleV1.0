import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { PlayerInventoryManager } from "./PlayerInventoryManager.js";

function createFixture() {
  const world = new World(createRuntimeServices());
  const heroId = world.createEntity();
  const bankId = world.createEntity();
  const productionStorageId = world.createEntity();
  const inventory = new PlayerInventoryManager(world);
  inventory.createInventory(heroId, 4);
  inventory.createInventory(bankId, 4);
  inventory.createInventory(productionStorageId, 4);
  inventory.setAccessibleStorageOwners(heroId, [heroId, bankId]);
  return { inventory, heroId, bankId, productionStorageId };
}

describe("PlayerInventoryManager accessible storage", () => {
  it("counts inventory and bank but excludes unrelated production storage", () => {
    const fixture = createFixture();
    fixture.inventory.addQuantity(fixture.heroId, "key", 1, { itemId: "key", stackable: true, maxStack: 99 });
    fixture.inventory.addQuantity(fixture.bankId, "key", 2, { itemId: "key", stackable: true, maxStack: 99 });
    fixture.inventory.addQuantity(fixture.productionStorageId, "key", 10, { itemId: "key", stackable: true, maxStack: 99 });

    expect(fixture.inventory.getAccessibleQuantity(fixture.heroId, "key")).toBe(3);
    expect(fixture.inventory.hasAccessibleQuantity(fixture.heroId, "key", 3)).toBe(true);
    expect(fixture.inventory.hasAccessibleQuantity(fixture.heroId, "key", 4)).toBe(false);
  });

  it("consumes inventory first then bank", () => {
    const fixture = createFixture();
    fixture.inventory.addQuantity(fixture.heroId, "key", 1, { itemId: "key", stackable: true, maxStack: 99 });
    fixture.inventory.addQuantity(fixture.bankId, "key", 2, { itemId: "key", stackable: true, maxStack: 99 });

    expect(fixture.inventory.removeAccessibleQuantity(fixture.heroId, "key", 2)).toBe(true);
    expect(fixture.inventory.getTotalQuantity(fixture.heroId, "key")).toBe(0);
    expect(fixture.inventory.getTotalQuantity(fixture.bankId, "key")).toBe(1);
  });

  it("does not consume anything when accessible stock is insufficient", () => {
    const fixture = createFixture();
    fixture.inventory.addQuantity(fixture.bankId, "key", 1, { itemId: "key", stackable: true, maxStack: 99 });

    expect(fixture.inventory.removeAccessibleQuantity(fixture.heroId, "key", 2)).toBe(false);
    expect(fixture.inventory.getTotalQuantity(fixture.bankId, "key")).toBe(1);
  });
});
