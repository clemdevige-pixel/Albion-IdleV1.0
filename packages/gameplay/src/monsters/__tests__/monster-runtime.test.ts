import { describe, it, expect, beforeEach } from "vitest";
import type { EntityId } from "@game/core";
import { World, createRuntimeServices } from "@game/core";
import { createDefaultStatRegistry } from "../../stats/stat-registry.js";
import { StatsManager } from "../../stats/stats-manager.js";
import type { StatId } from "../../stats/types.js";
import { MonsterRepository } from "../monster-repository.js";
import { MonsterFactory } from "../monster-factory.js";
import { MonsterRuntime } from "../monster-runtime.js";
import {
  validateMonsterTransition,
  transitionMonsterState,
} from "../monster-state-machine.js";
import { MonsterInstance } from "../monster-instance.js";
import {
  asMonsterDefinitionId,
  asMonsterInstanceId,
} from "../types.js";
import type { MonsterDefinition } from "../types.js";
import type {
  MonsterSpawnedEvent,
  MonsterDiedEvent,
  MonsterDespawnedEvent,
  MonsterStateChangedEvent,
} from "../monster-events.js";

const MAX_HEALTH = "stat_max_health" as StatId;
const PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;

function createTestWorld(): World {
  return new World(createRuntimeServices());
}

function makeDefinition(
  id: string = "MON-0001",
  overrides: Partial<MonsterDefinition> = {},
): MonsterDefinition {
  return {
    id: asMonsterDefinitionId(id),
    name: "Skeleton Warrior",
    faction: "Undead",
    role: "Melee Fighter",
    tier: 4,
    baseStats: [
      { statId: MAX_HEALTH, baseValue: 100 },
      { statId: PHYSICAL_DAMAGE, baseValue: 15 },
    ],
    ...overrides,
  };
}

function setupRuntime() {
  const world = createTestWorld();
  const registry = createDefaultStatRegistry();
  const statsManager = new StatsManager(world, registry);
  const repository = new MonsterRepository();
  const factory = new MonsterFactory(world, statsManager, repository);
  const runtime = new MonsterRuntime(factory);
  return { world, statsManager, repository, factory, runtime };
}

// ---------------------------------------------------------------------------
// Monster State Machine
// ---------------------------------------------------------------------------

describe("MonsterStateMachine", () => {
  describe("validateMonsterTransition", () => {
    it("allows alive -> dead", () => {
      expect(validateMonsterTransition("alive", "dead")).toBe(true);
    });

    it("allows alive -> despawned", () => {
      expect(validateMonsterTransition("alive", "despawned")).toBe(true);
    });

    it("allows dead -> despawned", () => {
      expect(validateMonsterTransition("dead", "despawned")).toBe(true);
    });

    it("rejects dead -> alive", () => {
      expect(validateMonsterTransition("dead", "alive")).toBe(false);
    });

    it("rejects despawned -> alive", () => {
      expect(validateMonsterTransition("despawned", "alive")).toBe(false);
    });

    it("rejects despawned -> dead", () => {
      expect(validateMonsterTransition("despawned", "dead")).toBe(false);
    });
  });

  describe("transitionMonsterState", () => {
    it("returns ok on valid transition", () => {
      const result = transitionMonsterState("alive", "dead");
      expect(result).toEqual({ ok: true, value: "dead" });
    });

    it("returns failure on invalid transition", () => {
      const result = transitionMonsterState("dead", "alive");
      expect(result).toEqual({ ok: false, reason: "invalid_transition" });
    });
  });
});

// ---------------------------------------------------------------------------
// Monster Instance
// ---------------------------------------------------------------------------

describe("MonsterInstance", () => {
  it("starts alive", () => {
    const instance = new MonsterInstance(
      asMonsterInstanceId("m1"),
      asMonsterDefinitionId("d1"),
      0 as unknown as EntityId,
      "Test Monster",
      3,
    );
    expect(instance.state).toBe("alive");
    expect(instance.isAlive()).toBe(true);
    expect(instance.isDead()).toBe(false);
    expect(instance.isDespawned()).toBe(false);
  });

  it("transitions to dead", () => {
    const instance = new MonsterInstance(
      asMonsterInstanceId("m1"),
      asMonsterDefinitionId("d1"),
      0 as unknown as EntityId,
      "Test Monster",
      3,
    );
    const result = instance.transition("dead");
    expect(result.ok).toBe(true);
    expect(instance.isDead()).toBe(true);
  });

  it("rejects invalid transition", () => {
    const instance = new MonsterInstance(
      asMonsterInstanceId("m1"),
      asMonsterDefinitionId("d1"),
      0 as unknown as EntityId,
      "Test Monster",
      3,
    );
    instance.transition("dead");
    const result = instance.transition("alive");
    expect(result.ok).toBe(false);
  });

  it("produces a data snapshot", () => {
    const instance = new MonsterInstance(
      asMonsterInstanceId("m1"),
      asMonsterDefinitionId("d1"),
      0 as unknown as EntityId,
      "Test Monster",
      3,
    );
    const data = instance.toData();
    expect(data.instanceId).toBe("m1");
    expect(data.name).toBe("Test Monster");
    expect(data.state).toBe("alive");
    expect(data.tier).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Monster Repository
// ---------------------------------------------------------------------------

describe("MonsterRepository", () => {
  it("registers and retrieves a definition", () => {
    const repo = new MonsterRepository();
    const def = makeDefinition();
    repo.register(def);
    const result = repo.get(def.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Skeleton Warrior");
    }
  });

  it("returns failure for unknown definition", () => {
    const repo = new MonsterRepository();
    const result = repo.get(asMonsterDefinitionId("UNKNOWN"));
    expect(result).toEqual({ ok: false, reason: "definition_not_found" });
  });

  it("reports count correctly", () => {
    const repo = new MonsterRepository();
    expect(repo.count()).toBe(0);
    repo.register(makeDefinition("A"));
    repo.register(makeDefinition("B"));
    expect(repo.count()).toBe(2);
  });

  it("checks existence with has()", () => {
    const repo = new MonsterRepository();
    const def = makeDefinition();
    expect(repo.has(def.id)).toBe(false);
    repo.register(def);
    expect(repo.has(def.id)).toBe(true);
  });

  it("getAll returns all definitions", () => {
    const repo = new MonsterRepository();
    repo.register(makeDefinition("A"));
    repo.register(makeDefinition("B"));
    expect(repo.getAll()).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Monster Factory
// ---------------------------------------------------------------------------

describe("MonsterFactory", () => {
  it("creates an instance from a definition", () => {
    const { statsManager, repository, factory } = setupRuntime();
    const def = makeDefinition();
    repository.register(def);

    const result = factory.create(def.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Skeleton Warrior");
      expect(result.value.isAlive()).toBe(true);
      expect(statsManager.hasStats(result.value.entityId)).toBe(true);
    }
  });

  it("returns failure for unknown definition", () => {
    const { factory } = setupRuntime();
    const result = factory.create(asMonsterDefinitionId("UNKNOWN"));
    expect(result).toEqual({ ok: false, reason: "definition_not_found" });
  });

  it("assigns unique instance IDs", () => {
    const { repository, factory } = setupRuntime();
    const def = makeDefinition();
    repository.register(def);

    const r1 = factory.create(def.id);
    const r2 = factory.create(def.id);
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.value.instanceId).not.toBe(r2.value.instanceId);
    }
  });

  it("sets base stats from definition", () => {
    const { statsManager, repository, factory } = setupRuntime();
    const def = makeDefinition();
    repository.register(def);

    const result = factory.create(def.id);
    if (result.ok) {
      const hp = statsManager.getStat(result.value.entityId, MAX_HEALTH);
      expect(hp.base).toBe(100);
    }
  });
});

// ---------------------------------------------------------------------------
// Monster Runtime
// ---------------------------------------------------------------------------

describe("MonsterRuntime", () => {
  let env: ReturnType<typeof setupRuntime>;

  beforeEach(() => {
    env = setupRuntime();
    env.repository.register(makeDefinition());
  });

  const DEF_ID = asMonsterDefinitionId("MON-0001");

  describe("spawn", () => {
    it("creates and tracks a monster", () => {
      const result = env.runtime.spawn(DEF_ID);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.state).toBe("alive");
        expect(result.value.name).toBe("Skeleton Warrior");
      }
      expect(env.runtime.activeCount()).toBe(1);
    });

    it("emits monsterSpawned event", () => {
      const events: MonsterSpawnedEvent[] = [];
      env.runtime.events.subscribe("monsterSpawned", (e) => events.push(e));
      env.runtime.spawn(DEF_ID);
      expect(events).toHaveLength(1);
      expect(events[0]!.name).toBe("Skeleton Warrior");
    });

    it("fails for unknown definition", () => {
      const result = env.runtime.spawn(asMonsterDefinitionId("NOPE"));
      expect(result).toEqual({ ok: false, reason: "definition_not_found" });
    });
  });

  describe("kill", () => {
    it("transitions monster to dead", () => {
      const spawnResult = env.runtime.spawn(DEF_ID);
      expect(spawnResult.ok).toBe(true);
      if (!spawnResult.ok) return;

      const killResult = env.runtime.kill(spawnResult.value.instanceId);
      expect(killResult).toEqual({ ok: true, value: "dead" });
      expect(env.runtime.activeCount()).toBe(0);
    });

    it("emits monsterDied and monsterStateChanged events", () => {
      const died: MonsterDiedEvent[] = [];
      const changed: MonsterStateChangedEvent[] = [];
      env.runtime.events.subscribe("monsterDied", (e) => died.push(e));
      env.runtime.events.subscribe("monsterStateChanged", (e) => changed.push(e));

      const spawnResult = env.runtime.spawn(DEF_ID);
      if (!spawnResult.ok) return;
      env.runtime.kill(spawnResult.value.instanceId);

      expect(died).toHaveLength(1);
      expect(changed).toHaveLength(1);
      expect(changed[0]!.previousState).toBe("alive");
      expect(changed[0]!.newState).toBe("dead");
    });

    it("fails for unknown instance", () => {
      const result = env.runtime.kill(asMonsterInstanceId("unknown"));
      expect(result).toEqual({ ok: false, reason: "instance_not_found" });
    });
  });

  describe("despawn", () => {
    it("transitions alive monster to despawned", () => {
      const spawnResult = env.runtime.spawn(DEF_ID);
      if (!spawnResult.ok) return;

      const result = env.runtime.despawn(spawnResult.value.instanceId);
      expect(result).toEqual({ ok: true, value: "despawned" });
    });

    it("transitions dead monster to despawned", () => {
      const spawnResult = env.runtime.spawn(DEF_ID);
      if (!spawnResult.ok) return;

      env.runtime.kill(spawnResult.value.instanceId);
      const result = env.runtime.despawn(spawnResult.value.instanceId);
      expect(result).toEqual({ ok: true, value: "despawned" });
    });

    it("emits monsterDespawned event", () => {
      const events: MonsterDespawnedEvent[] = [];
      env.runtime.events.subscribe("monsterDespawned", (e) => events.push(e));

      const spawnResult = env.runtime.spawn(DEF_ID);
      if (!spawnResult.ok) return;
      env.runtime.despawn(spawnResult.value.instanceId);

      expect(events).toHaveLength(1);
    });
  });

  describe("queries", () => {
    it("getInstance returns data for existing instance", () => {
      const spawnResult = env.runtime.spawn(DEF_ID);
      if (!spawnResult.ok) return;

      const result = env.runtime.getInstance(spawnResult.value.instanceId);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe("Skeleton Warrior");
      }
    });

    it("getInstance fails for unknown instance", () => {
      const result = env.runtime.getInstance(asMonsterInstanceId("nope"));
      expect(result).toEqual({ ok: false, reason: "instance_not_found" });
    });

    it("getAliveInstances returns only alive monsters", () => {
      env.runtime.spawn(DEF_ID);
      const s2 = env.runtime.spawn(DEF_ID);
      if (s2.ok) env.runtime.kill(s2.value.instanceId);

      expect(env.runtime.getAliveInstances()).toHaveLength(1);
    });

    it("getAllInstances returns all monsters", () => {
      env.runtime.spawn(DEF_ID);
      const s2 = env.runtime.spawn(DEF_ID);
      if (s2.ok) env.runtime.kill(s2.value.instanceId);

      expect(env.runtime.getAllInstances()).toHaveLength(2);
    });
  });

  describe("purge", () => {
    it("removes despawned instances", () => {
      const s1 = env.runtime.spawn(DEF_ID);
      env.runtime.spawn(DEF_ID);
      if (s1.ok) {
        env.runtime.despawn(s1.value.instanceId);
      }

      const purged = env.runtime.purge();
      expect(purged).toBe(1);
      expect(env.runtime.getAllInstances()).toHaveLength(1);
    });

    it("returns 0 when nothing to purge", () => {
      env.runtime.spawn(DEF_ID);
      expect(env.runtime.purge()).toBe(0);
    });
  });
});
