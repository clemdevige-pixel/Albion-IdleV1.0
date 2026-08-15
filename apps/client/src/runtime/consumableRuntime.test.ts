import { describe, it, expect } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import {
  AbilityManager,
  AutoAttackManager,
  createDefaultStatRegistry,
  DamageManager,
  DeathManager,
  InventoryManager,
  StatsManager,
  TargetManager,
  TargetValidator,
} from "@game/gameplay";
import { setupCombatEntity } from "./combatEntityFactory.js";
import { ConsumableRuntime } from "./ConsumableRuntime.js";
import { markCombatSegmentStart } from "./CombatSegmentLifecycle.js";

function setupTestEnvironment() {
  const world = new World(createRuntimeServices());

  const statRegistry = createDefaultStatRegistry();
  const statsManager = new StatsManager(world, statRegistry);
  const damageManager = new DamageManager(world, statsManager);
  const deathManager = new DeathManager(world, damageManager);
  const targetValidator = new TargetValidator(world);
  const targetManager = new TargetManager(world, targetValidator);
  const autoAttackManager = new AutoAttackManager(world, targetManager, statsManager);
  const abilityManager = new AbilityManager(world, statsManager);

  const heroId = setupCombatEntity(
    {
      world,
      statsManager,
      damageManager,
      deathManager,
      targetManager,
      autoAttackManager,
      abilityManager,
    },
    {
      maxHealth: 100,
      physDamage: 10,
      attackSpeed: 1.0,
      armor: 0,
      magicRes: 0,
    },
    { x: 0, y: 0 },
  );
  const inventoryManager = new InventoryManager(world, () => undefined);
  inventoryManager.createInventory(heroId, 10);

  const consumableRuntime = new ConsumableRuntime({
    inventoryManager,
    damageManager,
    deathManager,
    heroId,
  });

  return {
    world,
    heroId,
    inventoryManager,
    damageManager,
    deathManager,
    consumableRuntime,
  };
}

describe("ConsumableRuntime regression suite", () => {
  it("A. Potion while dead: rejects usage, leaves potion, HP, cooldown, and death state unchanged", () => {
    const env = setupTestEnvironment();

    env.inventoryManager.addQuantity(env.heroId, "item_health_potion", 1, {
      itemId: "item_health_potion",
      stackable: true,
      maxStack: 999,
    });

    env.damageManager.getHealth(env.heroId).currentHealth = 0;
    env.deathManager.checkDeath(env.heroId);
    expect(env.deathManager.isDead(env.heroId)).toBe(true);

    const result = env.consumableRuntime.useConsumable("item_health_potion");

    expect(result).toEqual({ ok: false, reason: "hero_dead" });
    expect(
      env.inventoryManager.getTotalQuantity(
        env.heroId,
        "item_health_potion",
      ),
    ).toBe(1);
    expect(env.damageManager.getHealth(env.heroId).currentHealth).toBe(0);
    expect(
      env.consumableRuntime.getState().healthPotionCooldownRemaining,
    ).toBe(0);
    expect(env.deathManager.isDead(env.heroId)).toBe(true);
  });

  it("B. Potion while alive: consumes potion, restores HP, triggers cooldown", () => {
    const env = setupTestEnvironment();

    env.inventoryManager.addQuantity(env.heroId, "item_health_potion", 1, {
      itemId: "item_health_potion",
      stackable: true,
      maxStack: 999,
    });

    env.damageManager.getHealth(env.heroId).currentHealth = 50;

    const result = env.consumableRuntime.useConsumable("item_health_potion");

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.itemId).toBe("item_health_potion");
      expect(result.restored).toBe(30);
      expect(result.currentHealth).toBe(80);
      expect(result.maxHealth).toBe(100);
    }

    expect(
      env.inventoryManager.getTotalQuantity(
        env.heroId,
        "item_health_potion",
      ),
    ).toBe(0);
    expect(env.damageManager.getHealth(env.heroId).currentHealth).toBe(80);
    expect(
      env.consumableRuntime.getState().healthPotionCooldownRemaining,
    ).toBe(20);
  });

  it("C. Segment start resets an active health-potion cooldown", () => {
    const env = setupTestEnvironment();

    env.inventoryManager.addQuantity(env.heroId, "item_health_potion", 1, {
      itemId: "item_health_potion",
      stackable: true,
      maxStack: 999,
    });
    env.damageManager.getHealth(env.heroId).currentHealth = 50;
    expect(env.consumableRuntime.useConsumable("item_health_potion").ok).toBe(true);
    expect(env.consumableRuntime.getState().healthPotionCooldownRemaining).toBe(20);

    markCombatSegmentStart();

    expect(env.consumableRuntime.getState().healthPotionCooldownRemaining).toBe(0);
  });

  it("Dead-state guard precedence: runs before inventory or cooldown checks", () => {
    const env = setupTestEnvironment();

    env.damageManager.getHealth(env.heroId).currentHealth = 0;
    env.deathManager.checkDeath(env.heroId);

    const result = env.consumableRuntime.useConsumable("item_health_potion");

    expect(result).toEqual({ ok: false, reason: "hero_dead" });
  });
});
