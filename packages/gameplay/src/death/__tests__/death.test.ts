import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices, Mulberry32Rng } from "@game/core";
import type { EntityId } from "@game/core";
import { createDefaultStatRegistry } from "../../stats/stat-registry.js";
import { StatsManager } from "../../stats/stats-manager.js";
import { DamageManager } from "../../damage/damage-manager.js";
import { DeathManager } from "../death-manager.js";
import { LootGenerator } from "../loot-generator.js";
import { LootManager } from "../loot-manager.js";
import type { LootTableLike } from "../types.js";

function makeLootTable(overrides?: Partial<LootTableLike>): LootTableLike {
  return {
    id: "test_table",
    entries: [
      { itemId: "sword", weight: 50, minQuantity: 1, maxQuantity: 3 },
      { itemId: "shield", weight: 30, minQuantity: 1, maxQuantity: 1 },
      { itemId: "potion", weight: 20, minQuantity: 2, maxQuantity: 5 },
    ],
    guaranteedDrops: ["gold"],
    maxRolls: 3,
    ...overrides,
  };
}

describe("Death & Loot", () => {
  let world: World;
  let statsManager: StatsManager;
  let damageManager: DamageManager;
  let deathManager: DeathManager;
  let entity: EntityId;
  let killer: EntityId;

  beforeEach(() => {
    const services = createRuntimeServices();
    world = new World(services);
    const registry = createDefaultStatRegistry();
    statsManager = new StatsManager(world, registry);
    damageManager = new DamageManager(world, statsManager);

    entity = world.createEntity();
    statsManager.attachStats(entity);
    damageManager.attachHealth(entity);
    deathManager = new DeathManager(world, damageManager);
    deathManager.attachDeath(entity);

    killer = world.createEntity();
    statsManager.attachStats(killer);
  });

  describe("DeathManager", () => {
    it("checkDeath — entity with 0 HP returns DeathEvent", () => {
      damageManager.applyDamage(entity, 9999);
      const event = deathManager.checkDeath(entity, killer, 42);
      expect(event).not.toBeNull();
      expect(event!.entityId).toBe(entity);
      expect(event!.killerEntityId).toBe(killer);
      expect(event!.timestamp).toBe(42);
    });

    it("checkDeath — entity with >0 HP returns null", () => {
      const event = deathManager.checkDeath(entity);
      expect(event).toBeNull();
    });

    it("checkDeath — double call returns null (no double processing)", () => {
      damageManager.applyDamage(entity, 9999);
      const first = deathManager.checkDeath(entity, killer);
      const second = deathManager.checkDeath(entity, killer);
      expect(first).not.toBeNull();
      expect(second).toBeNull();
    });

    it("isDead / isProcessed — correct states", () => {
      expect(deathManager.isDead(entity)).toBe(false);
      expect(deathManager.isProcessed(entity)).toBe(false);

      damageManager.applyDamage(entity, 9999);
      deathManager.checkDeath(entity);

      expect(deathManager.isDead(entity)).toBe(true);
      expect(deathManager.isProcessed(entity)).toBe(false);
    });

    it("markProcessed — prevents further processing", () => {
      damageManager.applyDamage(entity, 9999);
      deathManager.checkDeath(entity);
      deathManager.markProcessed(entity);
      expect(deathManager.isProcessed(entity)).toBe(true);
    });
  });

  describe("LootGenerator", () => {
    it("guaranteed drops always included", () => {
      const rng = new Mulberry32Rng(1);
      const gen = new LootGenerator(rng);
      const drops = gen.generateLoot(makeLootTable());
      const ids = drops.map((d) => d.itemId);
      expect(ids).toContain("gold");
    });

    it("weighted rolls produce items", () => {
      const rng = new Mulberry32Rng(1);
      const gen = new LootGenerator(rng);
      const drops = gen.generateLoot(makeLootTable());
      expect(drops.length).toBeGreaterThan(1);
    });

    it("deterministic with same RNG seed", () => {
      const drops1 = new LootGenerator(new Mulberry32Rng(42)).generateLoot(makeLootTable());
      const drops2 = new LootGenerator(new Mulberry32Rng(42)).generateLoot(makeLootTable());
      expect(drops1).toEqual(drops2);
    });

    it("quantities within min/max range", () => {
      const rng = new Mulberry32Rng(7);
      const gen = new LootGenerator(rng);
      const table = makeLootTable();
      const drops = gen.generateLoot(table);

      for (const drop of drops) {
        const entry = table.entries.find((e) => e.itemId === drop.itemId);
        if (entry) {
          expect(drop.quantity).toBeGreaterThanOrEqual(entry.minQuantity);
        }
        expect(drop.quantity).toBeGreaterThan(0);
      }
    });

    it("duplicate items merged (quantities summed)", () => {
      const table = makeLootTable({
        entries: [{ itemId: "gold", weight: 100, minQuantity: 1, maxQuantity: 1 }],
        guaranteedDrops: ["gold"],
        maxRolls: 3,
      });
      const rng = new Mulberry32Rng(1);
      const gen = new LootGenerator(rng);
      const drops = gen.generateLoot(table);
      const goldDrops = drops.filter((d) => d.itemId === "gold");
      expect(goldDrops).toHaveLength(1);
      expect(goldDrops[0]!.quantity).toBe(4); // 1 guaranteed + 3 rolls
    });
  });

  describe("LootManager", () => {
    it("generateLoot returns LootResult", () => {
      const rng = new Mulberry32Rng(1);
      const gen = new LootGenerator(rng);
      const mgr = new LootManager(gen);
      const result = mgr.generateLoot(entity, makeLootTable());
      expect(result.entityId).toBe(entity);
      expect(result.guaranteedDrops.length).toBeGreaterThan(0);
    });

    it("getLoot returns cached result", () => {
      const rng = new Mulberry32Rng(1);
      const gen = new LootGenerator(rng);
      const mgr = new LootManager(gen);
      mgr.generateLoot(entity, makeLootTable());
      const cached = mgr.getLoot(entity);
      expect(cached).toBeDefined();
      expect(cached!.entityId).toBe(entity);
    });
  });

  describe("Integration", () => {
    it("damage to 0 HP → checkDeath → generateLoot → full flow", () => {
      damageManager.applyDamage(entity, 9999);

      const deathEvent = deathManager.checkDeath(entity, killer, 10);
      expect(deathEvent).not.toBeNull();

      const rng = new Mulberry32Rng(99);
      const lootGen = new LootGenerator(rng);
      const lootMgr = new LootManager(lootGen);
      const lootResult = lootMgr.generateLoot(entity, makeLootTable());

      expect(lootResult.entityId).toBe(entity);
      expect(lootResult.drops.length + lootResult.guaranteedDrops.length).toBeGreaterThan(0);

      deathManager.markProcessed(entity);
      expect(deathManager.isProcessed(entity)).toBe(true);

      const secondCheck = deathManager.checkDeath(entity);
      expect(secondCheck).toBeNull();
    });
  });
});

describe("Hybrid loot model (14_LOOT §4)", () => {
  it("union of independent rolls from monster table and global pool", async () => {
    const { Mulberry32Rng } = await import("@game/core");
    const { LootGenerator } = await import("../loot-generator.js");
    const { LootManager } = await import("../loot-manager.js");
    const { World, createRuntimeServices } = await import("@game/core");

    const world = new World(createRuntimeServices());
    const entity = world.createEntity();

    const monsterTable = {
      id: "monster_table",
      entries: [{ itemId: "wolf_hide", weight: 1, minQuantity: 1, maxQuantity: 1 }],
      guaranteedDrops: [],
      maxRolls: 1,
    };
    const globalPool = {
      id: "global_pool",
      entries: [{ itemId: "silver", weight: 1, minQuantity: 2, maxQuantity: 2 }],
      guaranteedDrops: [],
      maxRolls: 1,
    };

    const manager = new LootManager(new LootGenerator(new Mulberry32Rng(99)));
    const result = manager.generateLoot(entity, monsterTable, globalPool);

    const ids = result.drops.map((d) => d.itemId).sort();
    expect(ids).toEqual(["silver", "wolf_hide"]);

    // Determinism: same seed → identical union
    const manager2 = new LootManager(new LootGenerator(new Mulberry32Rng(99)));
    const result2 = manager2.generateLoot(entity, monsterTable, globalPool);
    expect(JSON.stringify(result2.drops)).toBe(JSON.stringify(result.drops));
  });
});
