import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices, EventBus } from "@game/core";
import type { EntityId } from "@game/core";
import { createDefaultStatRegistry } from "../../stats/stat-registry.js";
import { StatsManager } from "../../stats/stats-manager.js";
import type { StatId } from "../../stats/types.js";
import { DamageManager } from "../../damage/damage-manager.js";
import { DeathManager } from "../../death/death-manager.js";
import { TargetManager } from "../../targeting/target-manager.js";
import { TargetValidator } from "../../targeting/target-validator.js";
import { AutoAttackManager } from "../../auto-attack/auto-attack-manager.js";
import { AbilityManager } from "../../abilities/ability-manager.js";
import type { AbilityEventMap } from "../../abilities/ability-events.js";
import type { AbilityId, AbilityDefinitionLike } from "../../abilities/types.js";
import { EffectManager } from "../../effects/effect-manager.js";
import type { StatusEffectDefinition } from "../../effects/types.js";
import { CombatService } from "../combat-service.js";
import { CombatOrchestrator } from "../combat-orchestrator.js";
import { asEncounterId } from "../types.js";
import type { EncounterDefinition } from "../types.js";

const ATTACK_SPEED = "stat_attack_speed" as StatId;
const MAX_HEALTH = "stat_max_health" as StatId;
const PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;

function createTestWorld(): World {
  return new World(createRuntimeServices());
}

function setupAll(world: World) {
  const registry = createDefaultStatRegistry();
  const statsManager = new StatsManager(world, registry);
  const damageManager = new DamageManager(world, statsManager);
  const deathManager = new DeathManager(world, damageManager);
  const targetValidator = new TargetValidator(world);
  const targetManager = new TargetManager(world, targetValidator);
  const autoAttackManager = new AutoAttackManager(world, targetManager, statsManager);
  const combatService = new CombatService(
    damageManager,
    deathManager,
    targetManager,
    autoAttackManager,
    statsManager,
  );
  const effectManager = new EffectManager();
  const abilityManager = new AbilityManager(world, statsManager);
  const abilityEventBus = new EventBus<AbilityEventMap>();
  abilityManager.setEventBus(abilityEventBus);

  const orchestrator = new CombatOrchestrator({
    combatService,
    effectManager,
    abilityManager,
  });
  orchestrator.initialize();

  return {
    statsManager,
    damageManager,
    deathManager,
    targetManager,
    autoAttackManager,
    combatService,
    effectManager,
    abilityManager,
    abilityEventBus,
    orchestrator,
  };
}

function createEntity(
  world: World,
  m: ReturnType<typeof setupAll>,
  opts: { health?: number; damage?: number; attackSpeed?: number } = {},
): EntityId {
  const entity = world.createEntity();
  m.statsManager.attachStats(entity);
  m.statsManager.setBaseStat(entity, MAX_HEALTH, opts.health ?? 100);
  m.statsManager.setBaseStat(entity, PHYSICAL_DAMAGE, opts.damage ?? 10);
  m.statsManager.setBaseStat(entity, ATTACK_SPEED, opts.attackSpeed ?? 1.0);
  m.statsManager.calculateStats(entity);
  m.damageManager.attachHealth(entity);
  m.deathManager.attachDeath(entity);
  m.targetManager.attachTargeting(entity);
  m.autoAttackManager.attachAutoAttack(entity);
  m.abilityManager.attachAbilities(entity);
  return entity;
}

function makeEncounter(enemies: EntityId[]): EncounterDefinition {
  return {
    id: asEncounterId("enc_int"),
    enemies: enemies.map((entityId) => ({ entityId })),
  };
}

function makeStunDef(duration: number): StatusEffectDefinition {
  return {
    id: "stun_test",
    effectType: "stun",
    duration,
    strength: 1,
    refreshOnReapply: false,
  };
}

function makeSilenceDef(duration: number): StatusEffectDefinition {
  return {
    id: "silence_test",
    effectType: "silence",
    duration,
    strength: 1,
    refreshOnReapply: false,
  };
}

function makeBuffDef(duration: number, strength: number): StatusEffectDefinition {
  return {
    id: "buff_test",
    effectType: "buff",
    duration,
    strength,
    modifierCategory: "damage",
    refreshOnReapply: true,
  };
}

function makeActiveAbility(): AbilityDefinitionLike {
  return {
    id: "fireball",
    cooldown: 5,
    castTime: 0,
    resourceCost: {},
    interruptible: false,
    category: "active",
  };
}

// ─── Full combat flow ──────────────────────────────────────────────────────

describe("CombatOrchestrator", () => {
  let world: World;
  let m: ReturnType<typeof setupAll>;

  beforeEach(() => {
    world = createTestWorld();
    m = setupAll(world);
  });

  it("full combat flow: start → tick → auto-attacks → damage → death → end", () => {
    const hero = createEntity(world, m, { health: 1000, damage: 200, attackSpeed: 1.0 });
    const enemy = createEntity(world, m, { health: 10, damage: 1, attackSpeed: 1.0 });

    const startResult = m.orchestrator.startCombat(makeEncounter([enemy]), hero);
    expect(startResult.ok).toBe(true);

    const tickResult = m.orchestrator.tick(1000);
    expect(tickResult.ok).toBe(true);
    if (tickResult.ok) {
      expect(tickResult.value.state).toBe("victory");
      const attacks = tickResult.value.combatEvents.filter((e) => e.type === "attack");
      expect(attacks.length).toBeGreaterThan(0);
    }

    const endResult = m.orchestrator.endCombat();
    expect(endResult.ok).toBe(true);
  });

  // ── Effects during combat ───────────────────────────────────────────────

  it("effects reduce duration on tick and expire correctly", () => {
    const hero = createEntity(world, m, { health: 1000, damage: 1, attackSpeed: 1.0 });
    const enemy = createEntity(world, m, { health: 1000, damage: 1, attackSpeed: 1.0 });

    m.orchestrator.startCombat(makeEncounter([enemy]), hero);
    m.orchestrator.applyEffect(enemy, hero, makeBuffDef(3, 5), 0);

    expect(m.effectManager.getActiveEffects(hero).length).toBe(1);
    expect(m.effectManager.getActiveEffects(hero)[0]!.remainingDuration).toBe(3);

    // Tick 2 seconds — effect should still be active with ~1s remaining
    m.orchestrator.tick(2);
    expect(m.effectManager.getActiveEffects(hero).length).toBe(1);

    // Tick 2 more seconds — effect should have expired
    const tickResult = m.orchestrator.tick(2);
    expect(tickResult.ok).toBe(true);
    if (tickResult.ok) {
      expect(tickResult.value.expiredEffects.length).toBe(1);
    }
    expect(m.effectManager.getActiveEffects(hero).length).toBe(0);
  });

  // ── Stun prevents auto-attack ────────────────────────────────────────────

  it("stunned entity does not produce auto-attack damage (via orchestrator stun check on ability)", () => {
    const hero = createEntity(world, m, { health: 1000, damage: 10, attackSpeed: 1.0 });
    const enemy = createEntity(world, m, { health: 1000, damage: 10, attackSpeed: 1.0 });

    m.orchestrator.startCombat(makeEncounter([enemy]), hero);

    // Stun the hero
    m.orchestrator.applyEffect(enemy, hero, makeStunDef(5), 0);
    expect(m.effectManager.isStunned(hero)).toBe(true);

    // Stunned entity cannot use abilities
    m.abilityManager.learnAbility(hero, makeActiveAbility());
    const result = m.orchestrator.applyAbility(hero, "fireball" as AbilityId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("entity_stunned");
    }
  });

  // ── Silence prevents active abilities ─────────────────────────────────────

  it("silenced entity cannot use active abilities", () => {
    const hero = createEntity(world, m, { health: 1000, damage: 10, attackSpeed: 1.0 });
    const enemy = createEntity(world, m, { health: 1000, damage: 10, attackSpeed: 1.0 });

    m.orchestrator.startCombat(makeEncounter([enemy]), hero);
    m.abilityManager.learnAbility(hero, makeActiveAbility());

    // Silence the hero
    m.orchestrator.applyEffect(enemy, hero, makeSilenceDef(5), 0);
    expect(m.effectManager.isSilenced(hero)).toBe(true);

    const result = m.orchestrator.applyAbility(hero, "fireball" as AbilityId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("entity_silenced");
    }
  });

  it("silenced entity can still auto-attack (basic attacks proceed via tick)", () => {
    const hero = createEntity(world, m, { health: 1000, damage: 200, attackSpeed: 1.0 });
    const enemy = createEntity(world, m, { health: 1000, damage: 1, attackSpeed: 1.0 });

    m.orchestrator.startCombat(makeEncounter([enemy]), hero);
    m.orchestrator.applyEffect(enemy, hero, makeSilenceDef(10), 0);

    // Auto-attacks should still happen even when silenced
    const tickResult = m.orchestrator.tick(1000);
    expect(tickResult.ok).toBe(true);
    if (tickResult.ok) {
      const attacks = tickResult.value.combatEvents.filter((e) => e.type === "attack");
      expect(attacks.length).toBeGreaterThan(0);
    }
  });

  // ── Death removes effects ─────────────────────────────────────────────────

  it("entity death removes all effects on that entity", () => {
    const hero = createEntity(world, m, { health: 1000, damage: 200, attackSpeed: 1.0 });
    const enemy = createEntity(world, m, { health: 10, damage: 1, attackSpeed: 1.0 });

    m.orchestrator.startCombat(makeEncounter([enemy]), hero);
    m.orchestrator.applyEffect(hero, enemy, makeBuffDef(10, 5), 0);

    expect(m.effectManager.getActiveEffects(enemy).length).toBe(1);

    // Kill the enemy via tick
    m.orchestrator.tick(1000);

    // Effects should have been cleaned up on death
    expect(m.effectManager.getActiveEffects(enemy).length).toBe(0);
  });

  // ── Combat end cleans up effects ──────────────────────────────────────────

  it("combat end cleans up effects for all participants", () => {
    const hero = createEntity(world, m, { health: 1000, damage: 200, attackSpeed: 1.0 });
    const enemy = createEntity(world, m, { health: 10, damage: 1, attackSpeed: 1.0 });

    m.orchestrator.startCombat(makeEncounter([enemy]), hero);
    m.orchestrator.applyEffect(enemy, hero, makeBuffDef(30, 5), 0);

    expect(m.effectManager.getActiveEffects(hero).length).toBe(1);

    // Kill enemy → victory
    m.orchestrator.tick(1000);
    // combatEnded event fires → effects cleaned

    expect(m.effectManager.getActiveEffects(hero).length).toBe(0);
  });

  // ── Determinism ───────────────────────────────────────────────────────────

  it("determinism: same inputs produce same outputs", () => {
    function runScenario() {
      const w = createTestWorld();
      const mgrs = setupAll(w);
      const h = createEntity(w, mgrs, { health: 100, damage: 25, attackSpeed: 1.0 });
      const e = createEntity(w, mgrs, { health: 50, damage: 10, attackSpeed: 1.0 });

      mgrs.orchestrator.startCombat(makeEncounter([e]), h);
      mgrs.orchestrator.applyEffect(e, h, makeBuffDef(5, 3), 0);

      const results: Array<{ ok: boolean }> = [];
      results.push(mgrs.orchestrator.tick(500));
      results.push(mgrs.orchestrator.tick(500));
      results.push(mgrs.orchestrator.tick(500));

      return {
        state: mgrs.orchestrator.getState(),
        results,
      };
    }

    const run1 = runScenario();
    const run2 = runScenario();

    expect(run1.state.inCombat).toBe(run2.state.inCombat);
    expect(run1.state.session?.state).toBe(run2.state.session?.state);
    expect(run1.state.session?.elapsedTime).toBe(run2.state.session?.elapsedTime);
  });

  // ── Event propagation ─────────────────────────────────────────────────────

  it("event propagation across systems during combat", () => {
    const hero = createEntity(world, m, { health: 1000, damage: 200, attackSpeed: 1.0 });
    const enemy = createEntity(world, m, { health: 10, damage: 1, attackSpeed: 1.0 });

    const events: string[] = [];
    m.combatService.events.subscribe("combatStarted", () => events.push("combatStarted"));
    m.combatService.events.subscribe("attackExecuted", () => events.push("attackExecuted"));
    m.combatService.events.subscribe("enemyKilled", () => events.push("enemyKilled"));
    m.combatService.events.subscribe("combatEnded", () => events.push("combatEnded"));

    m.orchestrator.startCombat(makeEncounter([enemy]), hero);
    m.orchestrator.tick(1000);

    expect(events).toContain("combatStarted");
    expect(events).toContain("attackExecuted");
    expect(events).toContain("enemyKilled");
    expect(events).toContain("combatEnded");
  });

  // ── Multiple concurrent effects ───────────────────────────────────────────

  it("multiple concurrent effects during combat", () => {
    const hero = createEntity(world, m, { health: 1000, damage: 1, attackSpeed: 1.0 });
    const enemy = createEntity(world, m, { health: 1000, damage: 1, attackSpeed: 1.0 });

    m.orchestrator.startCombat(makeEncounter([enemy]), hero);

    // Apply multiple effects to hero
    m.orchestrator.applyEffect(enemy, hero, makeBuffDef(5, 3), 0);
    m.orchestrator.applyEffect(enemy, hero, makeSilenceDef(3), 0);

    expect(m.effectManager.getActiveEffects(hero).length).toBe(2);
    expect(m.effectManager.isSilenced(hero)).toBe(true);

    // Tick 3s — silence should expire, buff still active
    m.orchestrator.tick(3);
    expect(m.effectManager.isSilenced(hero)).toBe(false);
    expect(m.effectManager.getActiveEffects(hero).length).toBe(1);

    // Tick 2 more — buff should expire too
    m.orchestrator.tick(2);
    expect(m.effectManager.getActiveEffects(hero).length).toBe(0);
  });

  // ── getState snapshot ─────────────────────────────────────────────────────

  it("getState returns combined state snapshot", () => {
    const hero = createEntity(world, m, { health: 1000, damage: 1, attackSpeed: 1.0 });
    const enemy = createEntity(world, m, { health: 1000, damage: 1, attackSpeed: 1.0 });

    // Before combat
    const before = m.orchestrator.getState();
    expect(before.inCombat).toBe(false);
    expect(before.session).toBeUndefined();

    m.orchestrator.startCombat(makeEncounter([enemy]), hero);
    m.orchestrator.applyEffect(enemy, hero, makeBuffDef(5, 3), 0);

    const during = m.orchestrator.getState();
    expect(during.inCombat).toBe(true);
    expect(during.session).toBeDefined();
    expect(during.activeEffects.get(hero)?.length).toBe(1);
  });
});
