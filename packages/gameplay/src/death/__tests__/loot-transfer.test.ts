import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices, Mulberry32Rng, type EntityId } from "@game/core";
import { InventoryManager } from "../../inventory/inventory-manager.js";
import { InventorySaveProvider } from "../../inventory/inventory-save-provider.js";
import type { ItemStackInfoLike, StackInfoResolver } from "../../inventory/types.js";
import { createDefaultStatRegistry } from "../../stats/stat-registry.js";
import { StatsManager } from "../../stats/stats-manager.js";
import { DamageManager } from "../../damage/damage-manager.js";
import { DeathManager } from "../death-manager.js";
import { LootGenerator } from "../loot-generator.js";
import { LootManager } from "../loot-manager.js";
import { LootTransferService } from "../loot-transfer.js";
import type { LootResult, LootTableLike } from "../types.js";

const STACK_INFO: Record<string, ItemStackInfoLike> = {
  RESOURCE_WOOD: { itemId: "RESOURCE_WOOD", stackable: true, maxStack: 10 },
  RESOURCE_ORE: { itemId: "RESOURCE_ORE", stackable: true, maxStack: 5 },
  EQUIPMENT_SWORD: { itemId: "EQUIPMENT_SWORD", stackable: false, maxStack: 1 },
};

const resolver: StackInfoResolver = (itemId) => STACK_INFO[itemId];

function makeLootResult(
  entityId: EntityId,
  drops: readonly { itemId: string; quantity: number }[],
  guaranteedDrops: readonly { itemId: string; quantity: number }[] = [],
): LootResult {
  return { entityId, drops, guaranteedDrops };
}

describe("LootTransferService", () => {
  let world: World;
  let inventoryManager: InventoryManager;
  let transferService: LootTransferService;
  let player: EntityId;
  let enemy: EntityId;

  beforeEach(() => {
    world = new World(createRuntimeServices());
    inventoryManager = new InventoryManager(world, resolver);
    transferService = new LootTransferService(inventoryManager);
    player = world.createEntity();
    enemy = world.createEntity();
    inventoryManager.createInventory(player, 4);
  });

  it("transfers loot into an empty inventory", () => {
    const outcome = transferService.transferLoot(
      player,
      makeLootResult(enemy, [{ itemId: "RESOURCE_WOOD", quantity: 7 }]),
    );

    expect(outcome.status).toBe("complete");
    expect(outcome.items).toEqual([
      { itemId: "RESOURCE_WOOD", requested: 7, added: 7, remainder: 0 },
    ]);
    expect(inventoryManager.getTotalQuantity(player, "RESOURCE_WOOD")).toBe(7);
  });

  it("adds onto existing stacks before creating new ones", () => {
    inventoryManager.addQuantity(player, "RESOURCE_WOOD", 6);

    const outcome = transferService.transferLoot(
      player,
      makeLootResult(enemy, [{ itemId: "RESOURCE_WOOD", quantity: 3 }]),
    );

    expect(outcome.status).toBe("complete");
    expect(inventoryManager.getOccupiedCount(player)).toBe(1);
    expect(inventoryManager.getTotalQuantity(player, "RESOURCE_WOOD")).toBe(9);
  });

  it("creates new stacks when quantity overflows maxStack", () => {
    const outcome = transferService.transferLoot(
      player,
      makeLootResult(enemy, [{ itemId: "RESOURCE_ORE", quantity: 12 }]),
    );

    expect(outcome.status).toBe("complete");
    expect(inventoryManager.getOccupiedCount(player)).toBe(3);
    expect(inventoryManager.getTotalQuantity(player, "RESOURCE_ORE")).toBe(12);
  });

  it("transfers multiple different items in one call, guaranteed drops first", () => {
    const outcome = transferService.transferLoot(
      player,
      makeLootResult(
        enemy,
        [
          { itemId: "RESOURCE_WOOD", quantity: 4 },
          { itemId: "EQUIPMENT_SWORD", quantity: 1 },
        ],
        [{ itemId: "RESOURCE_ORE", quantity: 2 }],
      ),
    );

    expect(outcome.status).toBe("complete");
    expect(outcome.items.map((item) => item.itemId)).toEqual([
      "RESOURCE_ORE",
      "RESOURCE_WOOD",
      "EQUIPMENT_SWORD",
    ]);
    expect(inventoryManager.getTotalQuantity(player, "RESOURCE_ORE")).toBe(2);
    expect(inventoryManager.getTotalQuantity(player, "RESOURCE_WOOD")).toBe(4);
    expect(inventoryManager.getTotalQuantity(player, "EQUIPMENT_SWORD")).toBe(1);
  });

  it("reports failure without losing anything when inventory is full", () => {
    for (let i = 0; i < 4; i += 1) {
      inventoryManager.addQuantity(player, "EQUIPMENT_SWORD", 1);
    }
    const before = inventoryManager.listSlots(player);

    const outcome = transferService.transferLoot(
      player,
      makeLootResult(enemy, [{ itemId: "RESOURCE_WOOD", quantity: 5 }]),
    );

    expect(outcome.status).toBe("failed");
    expect(outcome.items).toEqual([
      { itemId: "RESOURCE_WOOD", requested: 5, added: 0, remainder: 5 },
    ]);
    expect(inventoryManager.listSlots(player)).toEqual(before);
  });

  it("performs partial adds when capacity is insufficient", () => {
    inventoryManager.addQuantity(player, "EQUIPMENT_SWORD", 1);
    inventoryManager.addQuantity(player, "EQUIPMENT_SWORD", 1);
    inventoryManager.addQuantity(player, "EQUIPMENT_SWORD", 1);

    const outcome = transferService.transferLoot(
      player,
      makeLootResult(enemy, [{ itemId: "RESOURCE_ORE", quantity: 9 }]),
    );

    expect(outcome.status).toBe("partial");
    expect(outcome.items).toEqual([
      { itemId: "RESOURCE_ORE", requested: 9, added: 5, remainder: 4 },
    ]);
    expect(inventoryManager.getTotalQuantity(player, "RESOURCE_ORE")).toBe(5);
  });

  it("conserves exact quantities: added + remainder === requested for every drop", () => {
    inventoryManager.addQuantity(player, "RESOURCE_ORE", 3);
    inventoryManager.addQuantity(player, "EQUIPMENT_SWORD", 1);
    inventoryManager.addQuantity(player, "EQUIPMENT_SWORD", 1);

    const outcome = transferService.transferLoot(
      player,
      makeLootResult(enemy, [
        { itemId: "RESOURCE_ORE", quantity: 8 },
        { itemId: "RESOURCE_WOOD", quantity: 20 },
        { itemId: "EQUIPMENT_SWORD", quantity: 2 },
      ]),
    );

    for (const item of outcome.items) {
      expect(item.added + item.remainder).toBe(item.requested);
    }
    for (const item of outcome.items) {
      expect(
        inventoryManager.getTotalQuantity(player, item.itemId) -
          (item.itemId === "RESOURCE_ORE" ? 3 : item.itemId === "EQUIPMENT_SWORD" ? 2 : 0),
      ).toBe(item.added);
    }
  });

  it("never duplicates items: inventory total equals exactly what was added", () => {
    const outcome = transferService.transferLoot(
      player,
      makeLootResult(enemy, [
        { itemId: "RESOURCE_WOOD", quantity: 10 },
        { itemId: "RESOURCE_WOOD", quantity: 10 },
      ]),
    );

    const totalAdded = outcome.items.reduce((sum, item) => sum + item.added, 0);
    expect(inventoryManager.getTotalQuantity(player, "RESOURCE_WOOD")).toBe(totalAdded);
    expect(totalAdded).toBe(20);
  });

  it("is deterministic: same seed and same operations twice yield identical inventories", () => {
    function run(): readonly unknown[] {
      const w = new World(createRuntimeServices());
      const inv = new InventoryManager(w, resolver);
      const svc = new LootTransferService(inv);
      const p = w.createEntity();
      const e = w.createEntity();
      inv.createInventory(p, 8);

      const table: LootTableLike = {
        id: "wolf",
        entries: [
          { itemId: "RESOURCE_WOOD", weight: 60, minQuantity: 1, maxQuantity: 4 },
          { itemId: "RESOURCE_ORE", weight: 40, minQuantity: 1, maxQuantity: 3 },
        ],
        guaranteedDrops: ["EQUIPMENT_SWORD"],
        maxRolls: 3,
      };
      const lootManager = new LootManager(new LootGenerator(new Mulberry32Rng(1234)));
      for (let kill = 0; kill < 5; kill += 1) {
        svc.transferLoot(p, lootManager.generateLoot(e, table));
      }
      return inv.listSlots(p);
    }

    expect(run()).toEqual(run());
  });

  it("roundtrips loot-acquired items through InventorySaveProvider", () => {
    const provider = new InventorySaveProvider(inventoryManager, world);
    transferService.transferLoot(
      player,
      makeLootResult(
        enemy,
        [
          { itemId: "RESOURCE_WOOD", quantity: 13 },
          { itemId: "EQUIPMENT_SWORD", quantity: 1 },
        ],
        [{ itemId: "RESOURCE_ORE", quantity: 4 }],
      ),
    );

    const saved = JSON.parse(JSON.stringify(provider.save())) as unknown;

    const world2 = new World(createRuntimeServices());
    const manager2 = new InventoryManager(world2, resolver);
    const provider2 = new InventorySaveProvider(manager2, world2);
    provider2.load(saved);

    const restored = manager2.listInventories()[0]!;
    expect(manager2.listSlots(restored)).toEqual(inventoryManager.listSlots(player));
    expect(manager2.getTotalQuantity(restored, "RESOURCE_WOOD")).toBe(13);
    expect(manager2.getTotalQuantity(restored, "RESOURCE_ORE")).toBe(4);
    expect(manager2.getTotalQuantity(restored, "EQUIPMENT_SWORD")).toBe(1);
  });

  it("full loop: combat kill → death → loot generation → transfer → items in inventory", () => {
    const registry = createDefaultStatRegistry();
    const statsManager = new StatsManager(world, registry);
    const damageManager = new DamageManager(world, statsManager);
    const deathManager = new DeathManager(world, damageManager);

    statsManager.attachStats(enemy);
    damageManager.attachHealth(enemy);
    deathManager.attachDeath(enemy);

    damageManager.applyDamage(enemy, 9999);
    const deathEvent = deathManager.checkDeath(enemy, player, 100);
    expect(deathEvent).not.toBeNull();

    const table: LootTableLike = {
      id: "wolf",
      entries: [{ itemId: "RESOURCE_WOOD", weight: 1, minQuantity: 2, maxQuantity: 2 }],
      guaranteedDrops: ["RESOURCE_ORE"],
      maxRolls: 1,
    };
    const lootManager = new LootManager(new LootGenerator(new Mulberry32Rng(7)));
    const lootResult = lootManager.generateLoot(deathEvent!.entityId, table);

    const outcome = transferService.transferLoot(player, lootResult);
    deathManager.markProcessed(enemy);

    expect(outcome.status).toBe("complete");
    expect(inventoryManager.getTotalQuantity(player, "RESOURCE_WOOD")).toBe(2);
    expect(inventoryManager.getTotalQuantity(player, "RESOURCE_ORE")).toBeGreaterThanOrEqual(1);
    expect(deathManager.isProcessed(enemy)).toBe(true);
  });

  it("returns complete for an empty loot result", () => {
    const outcome = transferService.transferLoot(player, makeLootResult(enemy, []));
    expect(outcome.status).toBe("complete");
    expect(outcome.items).toEqual([]);
  });
});
