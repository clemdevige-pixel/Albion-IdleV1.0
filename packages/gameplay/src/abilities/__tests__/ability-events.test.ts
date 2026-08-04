import { describe, it, expect, beforeEach, vi } from "vitest";
import { World, createRuntimeServices, EventBus } from "@game/core";
import type { EntityId } from "@game/core";
import { StatsManager, createDefaultStatRegistry } from "../../stats/index.js";
import type { StatId } from "../../stats/types.js";
import { HealthComponent } from "../../damage/components.js";
import { AbilityManager } from "../ability-manager.js";
import type { AbilityEventMap } from "../ability-events.js";
import type { AbilityDefinitionLike, AbilityId, AbilityIntent } from "../types.js";

function aid(id: string): AbilityId {
  return id as AbilityId;
}

function makeDef(overrides: Partial<AbilityDefinitionLike> = {}): AbilityDefinitionLike {
  return {
    id: overrides.id ?? "slash",
    cooldown: overrides.cooldown ?? 5,
    castTime: overrides.castTime ?? 0,
    resourceCost: overrides.resourceCost ?? {},
    interruptible: overrides.interruptible ?? true,
    category: overrides.category,
    range: overrides.range,
    damageType: overrides.damageType,
    damageMultiplier: overrides.damageMultiplier,
    targetRule: overrides.targetRule,
  };
}

describe("AbilityManager.executeIntent", () => {
  let world: World;
  let statsManager: StatsManager;
  let manager: AbilityManager;
  let bus: EventBus<AbilityEventMap>;
  let entity: EntityId;
  let target: EntityId;

  beforeEach(() => {
    const services = createRuntimeServices();
    world = new World(services);
    const registry = createDefaultStatRegistry();
    statsManager = new StatsManager(world, registry);
    manager = new AbilityManager(world, statsManager);
    bus = new EventBus<AbilityEventMap>();
    manager.setEventBus(bus);

    entity = world.createEntity();
    statsManager.attachStats(entity);
    manager.attachAbilities(entity);

    target = world.createEntity();
    statsManager.attachStats(target);
    world.addComponent(target, HealthComponent, { currentHealth: 100, maxHealth: 100 });
    world.addComponent(entity, HealthComponent, { currentHealth: 100, maxHealth: 100 });
  });

  function intent(overrides: Partial<AbilityIntent> = {}): AbilityIntent {
    return {
      entityId: overrides.entityId ?? entity,
      abilityId: overrides.abilityId ?? aid("slash"),
      primaryTarget: overrides.primaryTarget ?? target,
      tick: overrides.tick ?? 1,
    };
  }

  it("execute valid basic_attack intent", () => {
    manager.learnAbility(entity, makeDef({ id: "slash", category: "basic_attack", cooldown: 2 }));
    const result = manager.executeIntent(intent());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.abilityId).toBe(aid("slash"));
      expect(result.value.target).toBe(target);
    }
  });

  it("execute valid active ability intent", () => {
    manager.learnAbility(entity, makeDef({ id: "slash", category: "active", cooldown: 5 }));
    const result = manager.executeIntent(intent());
    expect(result.ok).toBe(true);
  });

  it("reject when entity is dead", () => {
    manager.learnAbility(entity, makeDef({ id: "slash", category: "basic_attack" }));
    const health = world.getComponent(entity, HealthComponent);
    health.currentHealth = 0;
    const result = manager.executeIntent(intent());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("entity_dead");
  });

  it("reject ability not found", () => {
    const result = manager.executeIntent(intent({ abilityId: aid("unknown") }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ability_not_found");
  });

  it("reject ability not ready (cooldown)", () => {
    manager.learnAbility(entity, makeDef({ id: "slash", category: "active", cooldown: 5 }));
    manager.executeIntent(intent());
    const result = manager.executeIntent(intent());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ability_not_ready");
  });

  it("reject insufficient resources", () => {
    const other = world.createEntity();
    statsManager.attachStats(other);
    statsManager.setBaseStat(other, "stat_max_energy" as StatId, 5);
    statsManager.calculateStats(other);
    manager.attachAbilities(other);
    world.addComponent(other, HealthComponent, { currentHealth: 100, maxHealth: 100 });

    manager.learnAbility(other, makeDef({ id: "slash", category: "active", resourceCost: { energy: 10 } }));
    const result = manager.executeIntent(intent({ entityId: other }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("insufficient_resources");
  });

  it("reject passive ability execution", () => {
    manager.learnAbility(entity, makeDef({ id: "slash", category: "passive", cooldown: 0 }));
    const result = manager.executeIntent(intent());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ability_locked");
  });

  it("emits AbilityExecuted event on successful execution", () => {
    const handler = vi.fn();
    bus.subscribe("AbilityExecuted", handler);

    manager.learnAbility(entity, makeDef({ id: "slash", category: "basic_attack", cooldown: 2 }));
    manager.executeIntent(intent());

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({
      entityId: entity,
      abilityId: aid("slash"),
      category: "basic_attack",
      target,
    });
  });

  it("emits AbilityCooldownStarted on execution with cooldown", () => {
    const handler = vi.fn();
    bus.subscribe("AbilityCooldownStarted", handler);

    manager.learnAbility(entity, makeDef({ id: "slash", category: "active", cooldown: 7 }));
    manager.executeIntent(intent());

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({
      entityId: entity,
      abilityId: aid("slash"),
      duration: 7,
    });
  });

  it("emits AbilityCooldownFinished when cooldown ticks to zero", () => {
    const handler = vi.fn();
    bus.subscribe("AbilityCooldownFinished", handler);

    manager.learnAbility(entity, makeDef({ id: "slash", category: "active", cooldown: 3 }));
    manager.executeIntent(intent());

    manager.tickAbilities(entity, 3);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({
      entityId: entity,
      abilityId: aid("slash"),
    });
  });

  it("emits PassiveActivated on learn and PassiveRemoved on forget", () => {
    const activated = vi.fn();
    const removed = vi.fn();
    bus.subscribe("PassiveActivated", activated);
    bus.subscribe("PassiveRemoved", removed);

    manager.learnAbility(entity, makeDef({ id: "slash", category: "passive", cooldown: 0 }));
    expect(activated).toHaveBeenCalledOnce();
    expect(activated).toHaveBeenCalledWith({ entityId: entity, abilityId: aid("slash") });

    manager.forgetAbility(entity, aid("slash"));
    expect(removed).toHaveBeenCalledOnce();
    expect(removed).toHaveBeenCalledWith({ entityId: entity, abilityId: aid("slash") });
  });

  it("no passive events for non-passive abilities", () => {
    const activated = vi.fn();
    const removed = vi.fn();
    bus.subscribe("PassiveActivated", activated);
    bus.subscribe("PassiveRemoved", removed);

    manager.learnAbility(entity, makeDef({ id: "slash", category: "active" }));
    manager.forgetAbility(entity, aid("slash"));

    expect(activated).not.toHaveBeenCalled();
    expect(removed).not.toHaveBeenCalled();
  });

  it("category defaults to active when not specified", () => {
    const handler = vi.fn();
    bus.subscribe("AbilityExecuted", handler);

    manager.learnAbility(entity, makeDef({ id: "slash", cooldown: 2 }));
    manager.executeIntent(intent());

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ category: "active" }),
    );
  });

  it("no cooldown started event when cooldown is 0", () => {
    const handler = vi.fn();
    bus.subscribe("AbilityCooldownStarted", handler);

    manager.learnAbility(entity, makeDef({ id: "slash", category: "basic_attack", cooldown: 0 }));
    manager.executeIntent(intent());

    expect(handler).not.toHaveBeenCalled();
  });
});
