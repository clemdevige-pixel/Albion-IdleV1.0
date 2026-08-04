import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import type { EntityId } from "@game/core";
import { createDefaultStatRegistry } from "../../stats/stat-registry.js";
import { StatsManager } from "../../stats/stats-manager.js";
import type { StatId } from "../../stats/types.js";
import { DamageManager } from "../../damage/damage-manager.js";
import { DeathManager } from "../../death/death-manager.js";
import { TargetManager } from "../../targeting/target-manager.js";
import { TargetValidator } from "../../targeting/target-validator.js";
import { AutoAttackManager } from "../../auto-attack/auto-attack-manager.js";
import { CombatService } from "../combat-service.js";
import { CombatSession } from "../combat-session.js";
import { validateTransition, transitionCombatState } from "../combat-state-machine.js";
import { asCombatSessionId, asEncounterId } from "../types.js";
import type {
  CombatState,
  EncounterDefinition,
  CombatSessionData,
} from "../types.js";
import type {
  CombatStartedEvent,
  CombatEndedEvent,
} from "../combat-events.js";

const ATTACK_SPEED = "stat_attack_speed" as StatId;
const MAX_HEALTH = "stat_max_health" as StatId;
const PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;

function createTestWorld(): World {
  return new World(createRuntimeServices());
}

function setupManagers(world: World) {
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
  return { statsManager, damageManager, deathManager, targetManager, autoAttackManager, combatService };
}

function createCombatEntity(
  world: World,
  managers: ReturnType<typeof setupManagers>,
  opts: { health?: number; damage?: number; attackSpeed?: number } = {},
): EntityId {
  const entity = world.createEntity();
  managers.statsManager.attachStats(entity);
  managers.statsManager.setBaseStat(entity, MAX_HEALTH, opts.health ?? 100);
  managers.statsManager.setBaseStat(entity, PHYSICAL_DAMAGE, opts.damage ?? 10);
  managers.statsManager.setBaseStat(entity, ATTACK_SPEED, opts.attackSpeed ?? 1.0);
  managers.statsManager.calculateStats(entity);
  managers.damageManager.attachHealth(entity);
  managers.deathManager.attachDeath(entity);
  managers.targetManager.attachTargeting(entity);
  managers.autoAttackManager.attachAutoAttack(entity);
  return entity;
}

function makeEncounter(enemies: EntityId[]): EncounterDefinition {
  return {
    id: asEncounterId("enc_1"),
    enemies: enemies.map((entityId) => ({ entityId })),
  };
}

// ─── State Machine ──────────────────────────────────────────────────────────

describe("Combat State Machine", () => {
  it("validates allowed transitions", () => {
    expect(validateTransition("idle", "walking")).toBe(true);
    expect(validateTransition("walking", "combat")).toBe(true);
    expect(validateTransition("walking", "paused")).toBe(true);
    expect(validateTransition("combat", "victory")).toBe(true);
    expect(validateTransition("combat", "defeat")).toBe(true);
    expect(validateTransition("paused", "walking")).toBe(true);
    expect(validateTransition("victory", "walking")).toBe(true);
    expect(validateTransition("defeat", "idle")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(validateTransition("idle", "combat")).toBe(false);
    expect(validateTransition("combat", "idle")).toBe(false);
    expect(validateTransition("victory", "defeat")).toBe(false);
    expect(validateTransition("defeat", "combat")).toBe(false);
  });

  it("transitionState mutates session state on valid transition", () => {
    const session = { state: "combat" as CombatState };
    const result = transitionCombatState({ getState: () => session.state, setState: (s) => { session.state = s; } }, "victory");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("victory");
    }
    expect(session.state).toBe("victory");
  });

  it("transitionState fails on invalid transition", () => {
    const session = { state: "idle" as CombatState };
    const result = transitionCombatState({ getState: () => session.state, setState: (s) => { session.state = s; } }, "combat");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_in_combat");
    }
    expect(session.state).toBe("idle");
  });
});

// ─── Combat Session ─────────────────────────────────────────────────────────

describe("CombatSession", () => {
  it("creates with combat state and zero elapsed time", () => {
    const hero = 1 as EntityId;
    const enemies = [2 as EntityId, 3 as EntityId];
    const session = CombatSession.create(
      asCombatSessionId("s1"),
      asEncounterId("e1"),
      hero,
      enemies,
    );

    expect(session.getState()).toBe("combat");
    expect(session.getElapsedTime()).toBe(0);
    expect(session.getParticipants().hero).toBe(hero);
    expect(session.getParticipants().enemies).toEqual(enemies);
  });

  it("tick advances elapsed time", () => {
    const session = CombatSession.create(
      asCombatSessionId("s1"),
      asEncounterId("e1"),
      1 as EntityId,
      [2 as EntityId],
    );
    session.tick(100);
    expect(session.getElapsedTime()).toBe(100);
    session.tick(50);
    expect(session.getElapsedTime()).toBe(150);
  });

  it("toData returns a snapshot", () => {
    const session = CombatSession.create(
      asCombatSessionId("s1"),
      asEncounterId("e1"),
      1 as EntityId,
      [2 as EntityId],
    );
    session.tick(200);
    const data = session.toData();
    expect(data.sessionId).toBe("s1");
    expect(data.encounterId).toBe("e1");
    expect(data.state).toBe("combat");
    expect(data.elapsedTime).toBe(200);
  });
});

// ─── Combat Service ─────────────────────────────────────────────────────────

describe("CombatService", () => {
  let world: World;
  let managers: ReturnType<typeof setupManagers>;

  beforeEach(() => {
    world = createTestWorld();
    managers = setupManagers(world);
  });

  it("starts encounter with valid hero and enemies", () => {
    const hero = createCombatEntity(world, managers);
    const enemy = createCombatEntity(world, managers);
    const encounter = makeEncounter([enemy]);

    const result = managers.combatService.startEncounter(encounter, hero);
    expect(result.ok).toBe(true);
    expect(managers.combatService.isInCombat()).toBe(true);
  });

  it("rejects encounter when hero is dead", () => {
    const hero = createCombatEntity(world, managers, { health: 1 });
    const enemy = createCombatEntity(world, managers);

    // Kill the hero
    managers.damageManager.processDamage({
      source: enemy,
      target: hero,
      baseDamage: 9999,
      damageType: "physical",
      source_type: "auto_attack",
    });
    managers.deathManager.checkDeath(hero, enemy);

    const result = managers.combatService.startEncounter(makeEncounter([enemy]), hero);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("hero_dead");
  });

  it("rejects second encounter when one is active", () => {
    const hero = createCombatEntity(world, managers);
    const enemy1 = createCombatEntity(world, managers);
    const enemy2 = createCombatEntity(world, managers);

    managers.combatService.startEncounter(makeEncounter([enemy1]), hero);
    const result = managers.combatService.startEncounter(makeEncounter([enemy2]), hero);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("session_already_active");
  });

  it("rejects encounter with no enemies", () => {
    const hero = createCombatEntity(world, managers);
    const result = managers.combatService.startEncounter(
      { id: asEncounterId("e1"), enemies: [] },
      hero,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_encounter");
  });

  it("tick combat produces damage via auto-attacks", () => {
    const hero = createCombatEntity(world, managers, { damage: 10, attackSpeed: 1.0 });
    const enemy = createCombatEntity(world, managers, { health: 100, damage: 5, attackSpeed: 1.0 });

    managers.combatService.startEncounter(makeEncounter([enemy]), hero);

    // Tick enough to trigger at least one attack (attack interval = 1000ms for speed 1.0)
    const result = managers.combatService.tickCombat(1000);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const attacks = result.value.events.filter((e) => e.type === "attack");
      expect(attacks.length).toBeGreaterThan(0);
    }
  });

  it("victory when all enemies die", () => {
    const hero = createCombatEntity(world, managers, { health: 1000, damage: 200, attackSpeed: 1.0 });
    const enemy = createCombatEntity(world, managers, { health: 10, damage: 1, attackSpeed: 1.0 });

    managers.combatService.startEncounter(makeEncounter([enemy]), hero);

    // Tick enough for hero to kill the enemy (10hp, 200dmg)
    const result = managers.combatService.tickCombat(1000);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state).toBe("victory");
      const ended = result.value.events.find((e) => e.type === "combatEnded");
      expect(ended).toBeDefined();
      if (ended?.type === "combatEnded") {
        expect(ended.data.result).toBe("victory");
      }
    }
  });

  it("defeat when hero dies", () => {
    const hero = createCombatEntity(world, managers, { health: 10, damage: 1, attackSpeed: 1.0 });
    const enemy = createCombatEntity(world, managers, { health: 1000, damage: 200, attackSpeed: 1.0 });

    managers.combatService.startEncounter(makeEncounter([enemy]), hero);

    const result = managers.combatService.tickCombat(1000);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state).toBe("defeat");
    }
  });

  it("emits combatStarted event", () => {
    const hero = createCombatEntity(world, managers);
    const enemy = createCombatEntity(world, managers);

    let emitted: CombatStartedEvent | undefined;
    managers.combatService.events.subscribe("combatStarted", (e) => {
      emitted = e;
    });

    managers.combatService.startEncounter(makeEncounter([enemy]), hero);
    expect(emitted).toBeDefined();
    expect(emitted?.hero).toBe(hero);
    expect(emitted?.enemies).toEqual([enemy]);
  });

  it("emits combatEnded event on victory", () => {
    const hero = createCombatEntity(world, managers, { health: 1000, damage: 200, attackSpeed: 1.0 });
    const enemy = createCombatEntity(world, managers, { health: 10, damage: 1, attackSpeed: 1.0 });

    let emitted: CombatEndedEvent | undefined;
    managers.combatService.events.subscribe("combatEnded", (e) => {
      emitted = e;
    });

    managers.combatService.startEncounter(makeEncounter([enemy]), hero);
    managers.combatService.tickCombat(1000);

    expect(emitted).toBeDefined();
    expect(emitted?.result).toBe("victory");
  });

  it("elapsed time tracked correctly", () => {
    const hero = createCombatEntity(world, managers, { health: 1000, damage: 1, attackSpeed: 1.0 });
    const enemy = createCombatEntity(world, managers, { health: 1000, damage: 1, attackSpeed: 1.0 });

    managers.combatService.startEncounter(makeEncounter([enemy]), hero);
    managers.combatService.tickCombat(500);
    managers.combatService.tickCombat(300);

    const session = managers.combatService.getActiveSession();
    expect(session?.elapsedTime).toBe(800);
  });

  it("endEncounter from victory state succeeds", () => {
    const hero = createCombatEntity(world, managers, { health: 1000, damage: 200, attackSpeed: 1.0 });
    const enemy = createCombatEntity(world, managers, { health: 10, damage: 1, attackSpeed: 1.0 });

    managers.combatService.startEncounter(makeEncounter([enemy]), hero);
    managers.combatService.tickCombat(1000);

    const result = managers.combatService.endEncounter();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state).toBe("victory");
    }
    expect(managers.combatService.getActiveSession()).toBeUndefined();
  });

  it("endEncounter from combat state is rejected", () => {
    const hero = createCombatEntity(world, managers, { health: 1000, damage: 1, attackSpeed: 1.0 });
    const enemy = createCombatEntity(world, managers, { health: 1000, damage: 1, attackSpeed: 1.0 });

    managers.combatService.startEncounter(makeEncounter([enemy]), hero);

    const result = managers.combatService.endEncounter();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("combat_in_progress");
  });

  it("tickCombat fails with no active session", () => {
    const result = managers.combatService.tickCombat(100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no_active_session");
  });

  it("determinism: same tick sequence produces same result", () => {
    function runCombat(): CombatSessionData | undefined {
      const w = createTestWorld();
      const m = setupManagers(w);
      const h = createCombatEntity(w, m, { health: 100, damage: 25, attackSpeed: 1.0 });
      const e = createCombatEntity(w, m, { health: 50, damage: 10, attackSpeed: 1.0 });
      m.combatService.startEncounter(makeEncounter([e]), h);
      m.combatService.tickCombat(500);
      m.combatService.tickCombat(500);
      m.combatService.tickCombat(500);
      return m.combatService.getActiveSession() ?? undefined;
    }

    const run1 = runCombat();
    const run2 = runCombat();

    // Both runs should produce identical session state
    expect(run1?.state).toBe(run2?.state);
    expect(run1?.elapsedTime).toBe(run2?.elapsedTime);
  });
});
