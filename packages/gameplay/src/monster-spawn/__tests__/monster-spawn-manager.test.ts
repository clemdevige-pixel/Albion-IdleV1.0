import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { createDefaultStatRegistry } from "../../stats/stat-registry.js";
import { StatsManager } from "../../stats/stats-manager.js";
import type { StatId } from "../../stats/types.js";
import { MonsterRepository } from "../../monsters/monster-repository.js";
import { MonsterFactory } from "../../monsters/monster-factory.js";
import { MonsterRuntime } from "../../monsters/monster-runtime.js";
import { asMonsterDefinitionId } from "../../monsters/types.js";
import type { MonsterDefinition } from "../../monsters/types.js";
import { MonsterSpawnManager } from "../monster-spawn-manager.js";
import { asSpawnPointId, asSpawnGroupId } from "../spawn-types.js";
import type {
  SpawnPointConfig,
  SpawnGroupConfig,
} from "../spawn-types.js";
import type {
  MonsterSpawnedByPointEvent,
  MonsterDespawnedByPointEvent,
  SpawnDeniedEvent,
} from "../spawn-events.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_HEALTH = "stat_max_health" as StatId;

function createTestWorld(): World {
  return new World(createRuntimeServices());
}

function makeDefinition(id: string = "MON-0001"): MonsterDefinition {
  return {
    id: asMonsterDefinitionId(id),
    name: "Skeleton Warrior",
    faction: "Undead",
    role: "Melee Fighter",
    tier: 4,
    baseStats: [{ statId: MAX_HEALTH, baseValue: 100 }],
  };
}

function setupManager() {
  const world = createTestWorld();
  const registry = createDefaultStatRegistry();
  const statsManager = new StatsManager(world, registry);
  const repository = new MonsterRepository();
  const factory = new MonsterFactory(world, statsManager, repository);
  const runtime = new MonsterRuntime(factory);
  const manager = new MonsterSpawnManager(runtime);

  // Register a default definition
  const def = makeDefinition("MON-0001");
  repository.register(def);

  return { world, statsManager, repository, factory, runtime, manager };
}

function makeGroup(overrides: Partial<SpawnGroupConfig> = {}): SpawnGroupConfig {
  return {
    id: asSpawnGroupId("group-1"),
    name: "Test Group",
    populationCap: 5,
    ...overrides,
  };
}

function makePoint(overrides: Partial<SpawnPointConfig> = {}): SpawnPointConfig {
  return {
    id: asSpawnPointId("point-1"),
    definitionId: asMonsterDefinitionId("MON-0001"),
    groupId: asSpawnGroupId("group-1"),
    respawnDelayTicks: 10,
    enabled: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MonsterSpawnManager", () => {
  let runtime: MonsterRuntime;
  let manager: MonsterSpawnManager;
  beforeEach(() => {
    const setup = setupManager();
    runtime = setup.runtime;
    manager = setup.manager;
  });

  describe("registration", () => {
    it("registers a spawn group", () => {
      const group = makeGroup();
      manager.registerGroup(group);
      expect(manager.getRegisteredGroupIds()).toContain(group.id);
    });

    it("registers a spawn point", () => {
      manager.registerGroup(makeGroup());
      manager.registerSpawnPoint(makePoint());
      expect(manager.getRegisteredPointIds()).toContain(asSpawnPointId("point-1"));
    });

    it("emits spawnGroupRegistered event", () => {
      const events: string[] = [];
      manager.events.subscribe("spawnGroupRegistered", (e) => events.push(e.name));
      manager.registerGroup(makeGroup());
      expect(events).toEqual(["Test Group"]);
    });

    it("emits spawnPointRegistered event", () => {
      const events: string[] = [];
      manager.events.subscribe("spawnPointRegistered", (e) => events.push(e.spawnPointId));
      manager.registerGroup(makeGroup());
      manager.registerSpawnPoint(makePoint());
      expect(events).toHaveLength(1);
    });
  });

  describe("spawning on tick", () => {
    it("spawns a monster at an unoccupied point on tick", () => {
      manager.registerGroup(makeGroup());
      manager.registerSpawnPoint(makePoint());

      const spawned = manager.tick(1);
      expect(spawned).toBe(1);
      expect(runtime.activeCount()).toBe(1);
    });

    it("does not spawn at a disabled point", () => {
      manager.registerGroup(makeGroup());
      manager.registerSpawnPoint(makePoint({ enabled: false }));

      const spawned = manager.tick(1);
      expect(spawned).toBe(0);
    });

    it("does not spawn when population cap is reached", () => {
      manager.registerGroup(makeGroup({ populationCap: 1 }));
      manager.registerSpawnPoint(makePoint({ id: asSpawnPointId("p1") }));
      manager.registerSpawnPoint(makePoint({ id: asSpawnPointId("p2") }));

      manager.tick(1);
      // p1 spawned, p2 should be denied
      expect(runtime.activeCount()).toBe(1);
    });

    it("spawns multiple if cap allows", () => {
      manager.registerGroup(makeGroup({ populationCap: 3 }));
      manager.registerSpawnPoint(makePoint({ id: asSpawnPointId("p1") }));
      manager.registerSpawnPoint(makePoint({ id: asSpawnPointId("p2") }));
      manager.registerSpawnPoint(makePoint({ id: asSpawnPointId("p3") }));

      const spawned = manager.tick(1);
      expect(spawned).toBe(3);
    });

    it("does not re-spawn at an occupied point", () => {
      manager.registerGroup(makeGroup());
      manager.registerSpawnPoint(makePoint());

      manager.tick(1);
      const spawned2 = manager.tick(2);
      expect(spawned2).toBe(0);
      expect(runtime.activeCount()).toBe(1);
    });
  });

  describe("manual spawnAt", () => {
    it("spawns at a specific point", () => {
      manager.registerGroup(makeGroup());
      manager.registerSpawnPoint(makePoint());

      const result = manager.spawnAt(asSpawnPointId("point-1"), 1);
      expect(result.ok).toBe(true);
      expect(runtime.activeCount()).toBe(1);
    });

    it("returns error for group_not_found", () => {
      // Register point without registering group
      manager.registerSpawnPoint(makePoint());
      const result = manager.spawnAt(asSpawnPointId("point-1"), 1);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("group_not_found");
      }
    });
  });

  describe("despawn", () => {
    it("despawns a monster at a point", () => {
      manager.registerGroup(makeGroup());
      manager.registerSpawnPoint(makePoint());
      manager.tick(1);

      const despawned = manager.despawnAt(asSpawnPointId("point-1"));
      expect(despawned).toBe(true);
      expect(runtime.activeCount()).toBe(0);
    });

    it("returns false for empty point", () => {
      manager.registerGroup(makeGroup());
      manager.registerSpawnPoint(makePoint());

      const despawned = manager.despawnAt(asSpawnPointId("point-1"));
      expect(despawned).toBe(false);
    });

    it("emits spawnPointDespawned event", () => {
      manager.registerGroup(makeGroup());
      manager.registerSpawnPoint(makePoint());
      manager.tick(1);

      const events: MonsterDespawnedByPointEvent[] = [];
      manager.events.subscribe("spawnPointDespawned", (e) => events.push(e));
      manager.despawnAt(asSpawnPointId("point-1"));
      expect(events).toHaveLength(1);
      expect(events[0]!.spawnPointId).toBe(asSpawnPointId("point-1"));
    });
  });

  describe("respawn after death", () => {
    it("starts respawn timer when monster dies", () => {
      manager.registerGroup(makeGroup());
      manager.registerSpawnPoint(makePoint({ respawnDelayTicks: 5 }));
      manager.tick(1); // spawn

      // Get instance
      const instances = runtime.getAliveInstances();
      expect(instances).toHaveLength(1);
      const instanceId = instances[0]!.instanceId;

      // Kill it
      runtime.kill(instanceId);

      // Next tick activates the pending respawn timer
      const spawned2 = manager.tick(2);
      // Respawn timer just started at tick 2, delay is 5 — not ready
      expect(spawned2).toBe(0);
    });

    it("respawns after cooldown expires", () => {
      manager.registerGroup(makeGroup());
      manager.registerSpawnPoint(makePoint({ respawnDelayTicks: 3 }));
      manager.tick(1); // spawn

      const instances = runtime.getAliveInstances();
      const instanceId = instances[0]!.instanceId;
      runtime.kill(instanceId);

      // Tick 2: timer starts
      manager.tick(2);
      // Tick 3: 1 tick elapsed (need 3)
      manager.tick(3);
      // Tick 4: 2 ticks elapsed (need 3)
      manager.tick(4);
      // Tick 5: 3 ticks elapsed — ready!
      const spawned = manager.tick(5);
      expect(spawned).toBe(1);
      expect(runtime.activeCount()).toBe(1);
    });

    it("does not respawn before cooldown", () => {
      manager.registerGroup(makeGroup());
      manager.registerSpawnPoint(makePoint({ respawnDelayTicks: 10 }));
      manager.tick(1);

      const instanceId = runtime.getAliveInstances()[0]!.instanceId;
      runtime.kill(instanceId);

      manager.tick(2); // timer starts
      manager.tick(5); // only 3 elapsed, need 10
      expect(runtime.activeCount()).toBe(0);
    });
  });

  describe("events", () => {
    it("emits spawnPointSpawned on successful spawn", () => {
      const events: MonsterSpawnedByPointEvent[] = [];
      manager.events.subscribe("spawnPointSpawned", (e) => events.push(e));

      manager.registerGroup(makeGroup());
      manager.registerSpawnPoint(makePoint());
      manager.tick(1);

      expect(events).toHaveLength(1);
      expect(events[0]!.spawnPointId).toBe(asSpawnPointId("point-1"));
      expect(events[0]!.groupId).toBe(asSpawnGroupId("group-1"));
    });

    it("emits spawnDenied when cap reached", () => {
      const denied: SpawnDeniedEvent[] = [];
      manager.events.subscribe("spawnDenied", (e) => denied.push(e));

      manager.registerGroup(makeGroup({ populationCap: 1 }));
      manager.registerSpawnPoint(makePoint({ id: asSpawnPointId("p1") }));
      manager.registerSpawnPoint(makePoint({ id: asSpawnPointId("p2") }));

      manager.tick(1);
      // One should have been denied
      expect(denied).toHaveLength(1);
      expect(denied[0]!.reason).toBe("population_cap_reached");
    });
  });

  describe("queries", () => {
    it("getPointState returns state after spawn", () => {
      manager.registerGroup(makeGroup());
      manager.registerSpawnPoint(makePoint());
      manager.tick(1);

      const state = manager.getPointState(asSpawnPointId("point-1"));
      expect(state).toBeDefined();
      expect(state!.activeInstanceId).toBeDefined();
    });

    it("getGroupAliveCount returns correct count", () => {
      manager.registerGroup(makeGroup());
      manager.registerSpawnPoint(makePoint({ id: asSpawnPointId("p1") }));
      manager.registerSpawnPoint(makePoint({ id: asSpawnPointId("p2") }));
      manager.tick(1);

      expect(manager.getGroupAliveCount(asSpawnGroupId("group-1"))).toBe(2);
    });

    it("getPointState returns undefined for unknown point", () => {
      expect(manager.getPointState(asSpawnPointId("unknown"))).toBeUndefined();
    });
  });
});
