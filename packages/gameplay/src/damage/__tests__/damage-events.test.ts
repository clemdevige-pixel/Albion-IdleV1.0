import { describe, it, expect, beforeEach, vi } from "vitest";
import { World, createRuntimeServices, EventBus } from "@game/core";
import type { EntityId } from "@game/core";
import { createDefaultStatRegistry } from "../../stats/stat-registry.js";
import { StatsManager } from "../../stats/stats-manager.js";
import { DamageManager } from "../damage-manager.js";
import type { DamageEventMap } from "../damage-events.js";
import type { DamageRequest } from "../types.js";

function makeRequest(
  source: EntityId,
  target: EntityId,
  baseDamage: number,
  overrides?: Partial<DamageRequest>,
): DamageRequest {
  return {
    source,
    target,
    baseDamage,
    damageType: "physical",
    source_type: "auto_attack",
    ...overrides,
  };
}

describe("Damage Events", () => {
  let world: World;
  let statsManager: StatsManager;
  let damageManager: DamageManager;
  let eventBus: EventBus<DamageEventMap>;
  let attacker: EntityId;
  let defender: EntityId;

  beforeEach(() => {
    const services = createRuntimeServices();
    world = new World(services);
    const registry = createDefaultStatRegistry();
    statsManager = new StatsManager(world, registry);
    eventBus = new EventBus<DamageEventMap>();
    damageManager = new DamageManager(world, statsManager);
    damageManager.setEventBus(eventBus);

    attacker = world.createEntity();
    statsManager.attachStats(attacker);
    defender = world.createEntity();
    statsManager.attachStats(defender);
  });

  it("emits DamageDealt on processDamage", () => {
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);

    const handler = vi.fn();
    eventBus.subscribe("DamageDealt", handler);

    damageManager.processDamage(makeRequest(attacker, defender, 30));

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        source: attacker,
        target: defender,
        damageType: "physical",
        rawDamage: 30,
        finalDamage: 30,
        targetHealthAfter: 70,
      }),
    );
  });

  it("emits HealthChanged on processDamage", () => {
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);

    const handler = vi.fn();
    eventBus.subscribe("HealthChanged", handler);

    damageManager.processDamage(makeRequest(attacker, defender, 30));

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: defender,
        previousHealth: 100,
        newHealth: 70,
        maxHealth: 100,
      }),
    );
  });

  it("emits EntityKilled on lethal damage", () => {
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);

    const handler = vi.fn();
    eventBus.subscribe("EntityKilled", handler);

    damageManager.processDamage(makeRequest(attacker, defender, 150));

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        source: attacker,
        target: defender,
        damageType: "physical",
        overkill: 50,
      }),
    );
  });

  it("does not emit EntityKilled on non-lethal damage", () => {
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);

    const handler = vi.fn();
    eventBus.subscribe("EntityKilled", handler);

    damageManager.processDamage(makeRequest(attacker, defender, 30));

    expect(handler).not.toHaveBeenCalled();
  });

  it("emits HealthChanged on applyDamage", () => {
    damageManager.attachHealth(defender);

    const handler = vi.fn();
    eventBus.subscribe("HealthChanged", handler);

    damageManager.applyDamage(defender, 40);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: defender,
        previousHealth: 100,
        newHealth: 60,
      }),
    );
  });

  it("emits HealthChanged and HealApplied on healDamage", () => {
    damageManager.attachHealth(defender);
    damageManager.applyDamage(defender, 60);

    const healthHandler = vi.fn();
    const healHandler = vi.fn();
    eventBus.subscribe("HealthChanged", healthHandler);
    eventBus.subscribe("HealApplied", healHandler);

    damageManager.healDamage(defender, 30);

    // HealthChanged from applyDamage + HealthChanged from healDamage
    expect(healthHandler).toHaveBeenCalledOnce();
    expect(healthHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: defender,
        previousHealth: 40,
        newHealth: 70,
      }),
    );

    expect(healHandler).toHaveBeenCalledOnce();
    expect(healHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: defender,
        amount: 30,
        newHealth: 70,
      }),
    );
  });

  it("no events emitted when event bus not set", () => {
    const freshManager = new DamageManager(world, statsManager);
    freshManager.attachHealth(attacker);
    freshManager.attachHealth(defender);

    const handler = vi.fn();
    eventBus.subscribe("DamageDealt", handler);
    eventBus.subscribe("HealthChanged", handler);
    eventBus.subscribe("EntityKilled", handler);
    eventBus.subscribe("HealApplied", handler);

    freshManager.processDamage(makeRequest(attacker, defender, 150));
    freshManager.applyDamage(defender, 10);
    freshManager.healDamage(defender, 5);

    expect(handler).not.toHaveBeenCalled();
  });

  it("DamageRequest accepts optional context", () => {
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);

    const result = damageManager.processDamage(
      makeRequest(attacker, defender, 10, {
        context: { tick: 42, combatSessionId: "session-1" },
      }),
    );

    expect(result).not.toBeNull();
    expect(result!.finalDamage).toBe(10);
  });
});
