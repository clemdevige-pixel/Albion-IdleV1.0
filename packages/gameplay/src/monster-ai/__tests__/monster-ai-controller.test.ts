import { describe, it, expect, beforeEach } from "vitest";
import type { EntityId } from "@game/core";
import { World, createRuntimeServices } from "@game/core";
import { createDefaultStatRegistry } from "../../stats/stat-registry.js";
import { StatsManager } from "../../stats/stats-manager.js";
import type { StatId } from "../../stats/types.js";
import { DamageManager } from "../../damage/damage-manager.js";
import { DeathManager } from "../../death/death-manager.js";
import { EffectManager } from "../../effects/effect-manager.js";
import { TargetValidator } from "../../targeting/target-validator.js";
import { TargetManager } from "../../targeting/target-manager.js";
import { AutoAttackManager } from "../../auto-attack/auto-attack-manager.js";
import { AbilityManager } from "../../abilities/ability-manager.js";
import { HealthComponent } from "../../damage/components.js";
import { MonsterAIController } from "../monster-ai-controller.js";
import { asMonsterInstanceId } from "../../monsters/types.js";
import type { AbilityDefinitionLike, AbilityId } from "../../abilities/types.js";
import type {
  MonsterAIStateChangedEvent,
  MonsterAIActionSelectedEvent,
  MonsterAITargetAcquiredEvent,
  MonsterAITargetLostEvent,
} from "../monster-ai-events.js";

const MAX_HEALTH = "stat_max_health" as StatId;
const ATTACK_SPEED = "stat_attack_speed" as StatId;
const PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;

function createTestWorld(): World {
  return new World(createRuntimeServices());
}

function setupEnvironment() {
  const world = createTestWorld();
  const registry = createDefaultStatRegistry();
  const statsManager = new StatsManager(world, registry);
  const damageManager = new DamageManager(world, statsManager);
  const deathManager = new DeathManager(world, damageManager);
  const effectManager = new EffectManager();
  const targetValidator = new TargetValidator(world);
  const targetManager = new TargetManager(world, targetValidator);
  const autoAttackManager = new AutoAttackManager(world, targetManager, statsManager);
  const abilityManager = new AbilityManager(world, statsManager);

  const controller = new MonsterAIController({
    deathManager,
    effectManager,
    abilityManager,
    autoAttackManager,
    targetManager,
  });

  return {
    world,
    statsManager,
    damageManager,
    deathManager,
    effectManager,
    targetManager,
    autoAttackManager,
    abilityManager,
    controller,
  };
}

function createEntity(env: ReturnType<typeof setupEnvironment>, health = 100): EntityId {
  const entityId = env.world.createEntity();
  env.statsManager.attachStats(entityId);
  env.statsManager.setBaseStat(entityId, MAX_HEALTH, health);
  env.statsManager.setBaseStat(entityId, ATTACK_SPEED, 1);
  env.statsManager.setBaseStat(entityId, PHYSICAL_DAMAGE, 10);
  env.damageManager.attachHealth(entityId);
  env.deathManager.attachDeath(entityId);
  env.targetManager.attachTargeting(entityId);
  env.autoAttackManager.attachAutoAttack(entityId);
  return entityId;
}

const MONSTER_ID = asMonsterInstanceId("monster_1");
const MONSTER_ID_2 = asMonsterInstanceId("monster_2");

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe("MonsterAIController", () => {
  let env: ReturnType<typeof setupEnvironment>;

  beforeEach(() => {
    env = setupEnvironment();
  });

  describe("registration", () => {
    it("registers a monster and returns its entry", () => {
      const entityId = createEntity(env);
      const result = env.controller.register(MONSTER_ID, entityId);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.monsterInstanceId).toBe(MONSTER_ID);
        expect(result.value.behaviorState).toBe("idle");
      }
    });

    it("rejects duplicate registration", () => {
      const entityId = createEntity(env);
      env.controller.register(MONSTER_ID, entityId);
      const result = env.controller.register(MONSTER_ID, entityId);
      expect(result).toEqual({ ok: false, reason: "monster_already_registered" });
    });

    it("unregisters a monster", () => {
      const entityId = createEntity(env);
      env.controller.register(MONSTER_ID, entityId);
      const result = env.controller.unregister(MONSTER_ID);
      expect(result).toEqual({ ok: true, value: undefined });
      expect(env.controller.registeredCount()).toBe(0);
    });

    it("rejects unregistering unknown monster", () => {
      const result = env.controller.unregister(MONSTER_ID);
      expect(result).toEqual({ ok: false, reason: "monster_not_registered" });
    });

    it("tracks registered count", () => {
      const e1 = createEntity(env);
      const e2 = createEntity(env);
      expect(env.controller.registeredCount()).toBe(0);
      env.controller.register(MONSTER_ID, e1);
      expect(env.controller.registeredCount()).toBe(1);
      env.controller.register(MONSTER_ID_2, e2);
      expect(env.controller.registeredCount()).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────

  describe("queries", () => {
    it("getEntry returns the entry for a registered monster", () => {
      const entityId = createEntity(env);
      env.controller.register(MONSTER_ID, entityId);
      const entry = env.controller.getEntry(MONSTER_ID);
      expect(entry).toBeDefined();
      expect(entry?.behaviorState).toBe("idle");
    });

    it("getEntry returns undefined for unknown monster", () => {
      expect(env.controller.getEntry(MONSTER_ID)).toBeUndefined();
    });

    it("getBehaviorState returns the current state", () => {
      const entityId = createEntity(env);
      env.controller.register(MONSTER_ID, entityId);
      expect(env.controller.getBehaviorState(MONSTER_ID)).toBe("idle");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tick — idle (no target)
  // ─────────────────────────────────────────────────────────────────────────

  describe("tick — idle (no target)", () => {
    it("stays idle when no target is set", () => {
      const entityId = createEntity(env);
      env.controller.register(MONSTER_ID, entityId);

      const results = env.controller.tick();
      expect(results).toHaveLength(1);
      expect(results[0]!.newState).toBe("idle");
      expect(results[0]!.action.type).toBe("none");
    });

    it("does not emit state changed event when staying idle", () => {
      const entityId = createEntity(env);
      env.controller.register(MONSTER_ID, entityId);

      const events: MonsterAIStateChangedEvent[] = [];
      env.controller.events.subscribe("monsterAIStateChanged", (e) => events.push(e));

      env.controller.tick();
      expect(events).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tick — attacking (has valid target)
  // ─────────────────────────────────────────────────────────────────────────

  describe("tick — attacking (has valid target)", () => {
    it("transitions to attacking when a valid target exists", () => {
      const monsterEntity = createEntity(env);
      const heroEntity = createEntity(env);
      env.controller.register(MONSTER_ID, monsterEntity);
      env.targetManager.setTarget(monsterEntity, heroEntity);

      const results = env.controller.tick();
      expect(results).toHaveLength(1);
      expect(results[0]!.previousState).toBe("idle");
      expect(results[0]!.newState).toBe("attacking");
      expect(results[0]!.action.type).toBe("auto_attack");
    });

    it("emits state changed and target acquired events", () => {
      const monsterEntity = createEntity(env);
      const heroEntity = createEntity(env);
      env.controller.register(MONSTER_ID, monsterEntity);
      env.targetManager.setTarget(monsterEntity, heroEntity);

      const stateEvents: MonsterAIStateChangedEvent[] = [];
      const targetEvents: MonsterAITargetAcquiredEvent[] = [];
      env.controller.events.subscribe("monsterAIStateChanged", (e) => stateEvents.push(e));
      env.controller.events.subscribe("monsterAITargetAcquired", (e) => targetEvents.push(e));

      env.controller.tick();

      expect(stateEvents).toHaveLength(1);
      expect(stateEvents[0]!.previousState).toBe("idle");
      expect(stateEvents[0]!.newState).toBe("attacking");

      expect(targetEvents).toHaveLength(1);
      expect(targetEvents[0]!.targetEntityId).toBe(heroEntity);
    });

    it("emits action selected event for auto_attack", () => {
      const monsterEntity = createEntity(env);
      const heroEntity = createEntity(env);
      env.controller.register(MONSTER_ID, monsterEntity);
      env.targetManager.setTarget(monsterEntity, heroEntity);

      const actionEvents: MonsterAIActionSelectedEvent[] = [];
      env.controller.events.subscribe("monsterAIActionSelected", (e) => actionEvents.push(e));

      env.controller.tick();

      expect(actionEvents).toHaveLength(1);
      expect(actionEvents[0]!.action.type).toBe("auto_attack");
    });

    it("stays attacking on subsequent ticks with valid target", () => {
      const monsterEntity = createEntity(env);
      const heroEntity = createEntity(env);
      env.controller.register(MONSTER_ID, monsterEntity);
      env.targetManager.setTarget(monsterEntity, heroEntity);

      env.controller.tick(); // idle -> attacking

      const stateEvents: MonsterAIStateChangedEvent[] = [];
      env.controller.events.subscribe("monsterAIStateChanged", (e) => stateEvents.push(e));

      const results = env.controller.tick();
      expect(results[0]!.newState).toBe("attacking");
      // No state change event because we stayed attacking
      expect(stateEvents).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tick — target lost
  // ─────────────────────────────────────────────────────────────────────────

  describe("tick — target lost", () => {
    it("transitions back to idle when target becomes invalid", () => {
      const monsterEntity = createEntity(env);
      const heroEntity = createEntity(env);
      env.controller.register(MONSTER_ID, monsterEntity);
      env.targetManager.setTarget(monsterEntity, heroEntity);

      env.controller.tick(); // idle -> attacking

      // Kill the hero (make target invalid by setting health to 0)
      const healthData = env.world.getComponent(heroEntity, HealthComponent);
      healthData.currentHealth = 0;
      env.targetManager.clearTarget(monsterEntity);

      const targetLostEvents: MonsterAITargetLostEvent[] = [];
      env.controller.events.subscribe("monsterAITargetLost", (e) => targetLostEvents.push(e));

      const results = env.controller.tick();
      expect(results[0]!.previousState).toBe("attacking");
      expect(results[0]!.newState).toBe("idle");

      expect(targetLostEvents).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tick — dead monster
  // ─────────────────────────────────────────────────────────────────────────

  describe("tick — dead monster", () => {
    it("transitions to dead and produces no decision", () => {
      const monsterEntity = createEntity(env);
      env.controller.register(MONSTER_ID, monsterEntity);

      // Kill the monster
      const healthData = env.world.getComponent(monsterEntity, HealthComponent);
      healthData.currentHealth = 0;
      env.deathManager.checkDeath(monsterEntity);

      const stateEvents: MonsterAIStateChangedEvent[] = [];
      env.controller.events.subscribe("monsterAIStateChanged", (e) => stateEvents.push(e));

      const results = env.controller.tick();
      // Dead monsters return null (filtered out of tick results)
      expect(results).toHaveLength(0);

      expect(stateEvents).toHaveLength(1);
      expect(stateEvents[0]!.newState).toBe("dead");
    });

    it("does not emit state changed again once already dead", () => {
      const monsterEntity = createEntity(env);
      env.controller.register(MONSTER_ID, monsterEntity);

      const healthData = env.world.getComponent(monsterEntity, HealthComponent);
      healthData.currentHealth = 0;
      env.deathManager.checkDeath(monsterEntity);

      env.controller.tick(); // idle -> dead

      const stateEvents: MonsterAIStateChangedEvent[] = [];
      env.controller.events.subscribe("monsterAIStateChanged", (e) => stateEvents.push(e));

      env.controller.tick(); // still dead
      expect(stateEvents).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tick — stunned monster
  // ─────────────────────────────────────────────────────────────────────────

  describe("tick — stunned monster", () => {
    it("produces no action when stunned", () => {
      const monsterEntity = createEntity(env);
      const heroEntity = createEntity(env);
      env.controller.register(MONSTER_ID, monsterEntity);
      env.targetManager.setTarget(monsterEntity, heroEntity);

      // Apply stun
      env.effectManager.applyEffect(heroEntity, monsterEntity, {
        id: "stun_test",
        effectType: "stun",
        duration: 5,
        strength: 1,
        refreshOnReapply: false,
      }, 0);

      const results = env.controller.tick();
      expect(results).toHaveLength(1);
      expect(results[0]!.action.type).toBe("none");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Action selection — abilities
  // ─────────────────────────────────────────────────────────────────────────

  describe("action selection — abilities", () => {
    it("selects a ready ability over auto-attack", () => {
      const monsterEntity = createEntity(env);
      const heroEntity = createEntity(env);
      env.controller.register(MONSTER_ID, monsterEntity);
      env.targetManager.setTarget(monsterEntity, heroEntity);

      // Give monster an ability
      env.abilityManager.attachAbilities(monsterEntity);
      const abilityDef: AbilityDefinitionLike = {
        id: "fireball",
        cooldown: 5,
        castTime: 0,
        resourceCost: {},
        interruptible: false,
        category: "active",
      };
      env.abilityManager.learnAbility(monsterEntity, abilityDef);

      const results = env.controller.tick();
      expect(results[0]!.action.type).toBe("ability");
      expect(results[0]!.action.abilityId).toBe("fireball" as AbilityId);
    });

    it("falls back to auto-attack when silenced", () => {
      const monsterEntity = createEntity(env);
      const heroEntity = createEntity(env);
      env.controller.register(MONSTER_ID, monsterEntity);
      env.targetManager.setTarget(monsterEntity, heroEntity);

      env.abilityManager.attachAbilities(monsterEntity);
      env.abilityManager.learnAbility(monsterEntity, {
        id: "fireball",
        cooldown: 5,
        castTime: 0,
        resourceCost: {},
        interruptible: false,
        category: "active",
      });

      // Apply silence
      env.effectManager.applyEffect(heroEntity, monsterEntity, {
        id: "silence_test",
        effectType: "silence",
        duration: 5,
        strength: 1,
        refreshOnReapply: false,
      }, 0);

      const results = env.controller.tick();
      expect(results[0]!.action.type).toBe("auto_attack");
    });

    it("falls back to auto-attack when all abilities are on cooldown", () => {
      const monsterEntity = createEntity(env);
      const heroEntity = createEntity(env);
      env.controller.register(MONSTER_ID, monsterEntity);
      env.targetManager.setTarget(monsterEntity, heroEntity);

      env.abilityManager.attachAbilities(monsterEntity);
      const abilityDef: AbilityDefinitionLike = {
        id: "fireball",
        cooldown: 10,
        castTime: 0,
        resourceCost: {},
        interruptible: false,
        category: "active",
      };
      env.abilityManager.learnAbility(monsterEntity, abilityDef);

      // Put ability on cooldown
      env.abilityManager.executeIntent({
        entityId: monsterEntity,
        abilityId: "fireball" as AbilityId,
        tick: 0,
      });

      const results = env.controller.tick();
      expect(results[0]!.action.type).toBe("auto_attack");
    });

    it("ignores passive abilities", () => {
      const monsterEntity = createEntity(env);
      const heroEntity = createEntity(env);
      env.controller.register(MONSTER_ID, monsterEntity);
      env.targetManager.setTarget(monsterEntity, heroEntity);

      env.abilityManager.attachAbilities(monsterEntity);
      env.abilityManager.learnAbility(monsterEntity, {
        id: "passive_buff",
        cooldown: 0,
        castTime: 0,
        resourceCost: {},
        interruptible: false,
        category: "passive",
      });

      const results = env.controller.tick();
      // Should fall through to auto_attack since passive is skipped
      expect(results[0]!.action.type).toBe("auto_attack");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // tickOne
  // ─────────────────────────────────────────────────────────────────────────

  describe("tickOne", () => {
    it("ticks a single monster", () => {
      const entityId = createEntity(env);
      env.controller.register(MONSTER_ID, entityId);

      const result = env.controller.tickOne(MONSTER_ID);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.newState).toBe("idle");
      }
    });

    it("returns failure for unknown monster", () => {
      const result = env.controller.tickOne(MONSTER_ID);
      expect(result).toEqual({ ok: false, reason: "monster_not_registered" });
    });

    it("returns monster_dead for dead monster", () => {
      const monsterEntity = createEntity(env);
      env.controller.register(MONSTER_ID, monsterEntity);

      const healthData = env.world.getComponent(monsterEntity, HealthComponent);
      healthData.currentHealth = 0;
      env.deathManager.checkDeath(monsterEntity);

      const result = env.controller.tickOne(MONSTER_ID);
      expect(result).toEqual({ ok: false, reason: "monster_dead" });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Multiple monsters
  // ─────────────────────────────────────────────────────────────────────────

  describe("multiple monsters", () => {
    it("ticks all registered monsters", () => {
      const e1 = createEntity(env);
      const e2 = createEntity(env);
      env.controller.register(MONSTER_ID, e1);
      env.controller.register(MONSTER_ID_2, e2);

      const results = env.controller.tick();
      expect(results).toHaveLength(2);
    });

    it("produces deterministic results", () => {
      const e1 = createEntity(env);
      const e2 = createEntity(env);
      const heroEntity = createEntity(env);

      env.controller.register(MONSTER_ID, e1);
      env.controller.register(MONSTER_ID_2, e2);
      env.targetManager.setTarget(e1, heroEntity);
      env.targetManager.setTarget(e2, heroEntity);

      const results1 = env.controller.tick();
      // Reset state for second run
      env.controller.unregister(MONSTER_ID);
      env.controller.unregister(MONSTER_ID_2);
      env.controller.register(MONSTER_ID, e1);
      env.controller.register(MONSTER_ID_2, e2);

      const results2 = env.controller.tick();

      expect(results1.map((r) => r.action.type)).toEqual(results2.map((r) => r.action.type));
    });
  });
});
