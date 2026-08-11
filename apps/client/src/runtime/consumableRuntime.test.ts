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

    // Give hero 1 health potion
    env.inventoryManager.addQuantity(env.heroId, "item_health_potion", 1, {
      itemId: "item_health_potion",
      stackable: true,
      maxStack: 999,
    });

    // Reduce health to 0 and trigger death
    env.damageManager.getHealth(env.heroId).currentHealth = 0;
    env.deathManager.checkDeath(env.heroId);
    expect(env.deathManager.isDead(env.heroId)).toBe(true);

    // Attempt to consume health potion while dead
    const result = env.consumableRuntime.useConsumable("item_health_potion");

    // 1. Returns ok: false with reason: "hero_dead"
    expect(result).toEqual({ ok: false, reason: "hero_dead" });

    // 2. Potion quantity remains unchanged (1)
    expect(
      env.inventoryManager.getTotalQuantity(
        env.heroId,
        "item_health_potion",
      ),
    ).toBe(1);

    // 3. HP remains 0
    expect(env.damageManager.getHealth(env.heroId).currentHealth).toBe(0);

    // 4. Cooldown remains 0
    expect(
      env.consumableRuntime.getState().healthPotionCooldownRemaining,
    ).toBe(0);

    // 5. Hero remains dead
    expect(env.deathManager.isDead(env.heroId)).toBe(true);
  });

  it("B. Potion while alive: consumes potion, restores HP, triggers cooldown", () => {
    const env = setupTestEnvironment();

    // Give hero 1 health potion
    env.inventoryManager.addQuantity(env.heroId, "item_health_potion", 1, {
      itemId: "item_health_potion",
      stackable: true,
      maxStack: 999,
    });

    // Reduce health to 50 HP (out of 100 max HP)
    env.damageManager.getHealth(env.heroId).currentHealth = 50;

    // Use health potion while alive
    const result = env.consumableRuntime.useConsumable("item_health_potion");

    // 1. Returns ok: true with restored amount
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.itemId).toBe("item_health_potion");
      expect(result.restored).toBe(30); // 30% of 100 max HP
      expect(result.currentHealth).toBe(80);
      expect(result.maxHealth).toBe(100);
    }

    // 2. Potion consumed from inventory
    expect(
      env.inventoryManager.getTotalQuantity(
        env.heroId,
        "item_health_potion",
      ),
    ).toBe(0);

    // 3. HP restored to 80
    expect(env.damageManager.getHealth(env.heroId).currentHealth).toBe(80);

    // 4. Cooldown triggered (20s)
    expect(
      env.consumableRuntime.getState().healthPotionCooldownRemaining,
    ).toBe(20);
  });

  it("Dead-state guard precedence: runs before inventory or cooldown checks", () => {
    const env = setupTestEnvironment();

    // Kill hero with 0 potions in inventory
    env.damageManager.getHealth(env.heroId).currentHealth = 0;
    env.deathManager.checkDeath(env.heroId);

    // Attempt to use potion
    const result = env.consumableRuntime.useConsumable("item_health_potion");

    // Returns "hero_dead" rather than "not_in_inventory"
    expect(result).toEqual({ ok: false, reason: "hero_dead" });
  });
});
