import { EventBus } from "@game/core";
import type { MonsterRuntime } from "../monsters/monster-runtime.js";
import type { MonsterInstanceId } from "../monsters/types.js";
import type { SpawnEventMap } from "./spawn-events.js";
import { evaluateSpawnConditions } from "./spawn-conditions.js";
import { getReadySpawnPoints } from "./spawn-scheduler.js";
import type {
  SpawnConditionResult,
  SpawnGroupConfig,
  SpawnGroupId,
  SpawnPointConfig,
  SpawnPointId,
  SpawnPointState,
} from "./spawn-types.js";

/**
 * Orchestrates monster spawning/despawning across registered spawn points.
 * Tick-driven, data-driven, pure gameplay — no React/Phaser.
 */
export class MonsterSpawnManager {
  readonly events: EventBus<SpawnEventMap> = new EventBus<SpawnEventMap>();

  readonly #runtime: MonsterRuntime;
  readonly #pointConfigs = new Map<SpawnPointId, SpawnPointConfig>();
  readonly #pointStates = new Map<SpawnPointId, SpawnPointState>();
  readonly #groupConfigs = new Map<SpawnGroupId, SpawnGroupConfig>();
  readonly #pendingRespawns = new Set<SpawnPointId>();

  constructor(runtime: MonsterRuntime) {
    this.#runtime = runtime;

    // Listen for monster deaths to start respawn timers
    this.#runtime.events.subscribe("monsterDied", (evt) => {
      this.#onMonsterDied(evt.instanceId);
    });
  }

  // ── Registration ─────────────────────────────────────────────────────────

  registerGroup(config: SpawnGroupConfig): void {
    this.#groupConfigs.set(config.id, config);
    this.events.publish("spawnGroupRegistered", {
      groupId: config.id,
      name: config.name,
      populationCap: config.populationCap,
    });
  }

  registerSpawnPoint(config: SpawnPointConfig): void {
    this.#pointConfigs.set(config.id, config);
    this.#pointStates.set(config.id, {
      activeInstanceId: undefined,
      respawnStartTick: undefined,
    });
    this.events.publish("spawnPointRegistered", {
      spawnPointId: config.id,
      groupId: config.groupId,
      definitionId: config.definitionId,
    });
  }

  // ── Tick ──────────────────────────────────────────────────────────────────

  /**
   * Processes a single tick: checks all spawn points and spawns where ready.
   * Returns the number of monsters spawned this tick.
   */
  tick(currentTick: number): number {
    // Activate pending respawn timers with the current tick
    for (const pointId of this.#pendingRespawns) {
      const state = this.#pointStates.get(pointId);
      if (state !== undefined) {
        this.#pointStates.set(pointId, {
          activeInstanceId: undefined,
          respawnStartTick: currentTick,
        });
        const config = this.#pointConfigs.get(pointId);
        if (config !== undefined) {
          this.events.publish("respawnTimerStarted", {
            spawnPointId: pointId,
            delayTicks: config.respawnDelayTicks,
          });
        }
      }
    }
    this.#pendingRespawns.clear();

    const readyPoints = getReadySpawnPoints(
      this.#pointConfigs,
      this.#pointStates,
      currentTick,
    );

    let spawned = 0;
    for (const pointId of readyPoints) {
      const result = this.#trySpawnAt(pointId, currentTick);
      if (result.ok) {
        spawned += 1;
      }
    }
    return spawned;
  }

  // ── Manual spawn / despawn ───────────────────────────────────────────────

  spawnAt(pointId: SpawnPointId, currentTick: number): SpawnConditionResult {
    return this.#trySpawnAt(pointId, currentTick);
  }

  despawnAt(pointId: SpawnPointId): boolean {
    const state = this.#pointStates.get(pointId);
    if (state === undefined || state.activeInstanceId === undefined) {
      return false;
    }

    const config = this.#pointConfigs.get(pointId);
    if (config === undefined) return false;

    const instanceId = state.activeInstanceId;
    this.#runtime.despawn(instanceId);

    this.#pointStates.set(pointId, {
      activeInstanceId: undefined,
      respawnStartTick: undefined,
    });

    this.events.publish("spawnPointDespawned", {
      spawnPointId: pointId,
      groupId: config.groupId,
      instanceId,
    });

    return true;
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  getPointState(pointId: SpawnPointId): SpawnPointState | undefined {
    return this.#pointStates.get(pointId);
  }

  getGroupAliveCount(groupId: SpawnGroupId): number {
    let count = 0;
    for (const [pointId, config] of this.#pointConfigs) {
      if (config.groupId !== groupId) continue;
      const state = this.#pointStates.get(pointId);
      if (state?.activeInstanceId !== undefined) {
        const result = this.#runtime.getInstance(state.activeInstanceId);
        if (result.ok && result.value.state === "alive") {
          count += 1;
        }
      }
    }
    return count;
  }

  getRegisteredPointIds(): readonly SpawnPointId[] {
    return [...this.#pointConfigs.keys()];
  }

  getRegisteredGroupIds(): readonly SpawnGroupId[] {
    return [...this.#groupConfigs.keys()];
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  #trySpawnAt(pointId: SpawnPointId, currentTick: number): SpawnConditionResult {
    const config = this.#pointConfigs.get(pointId);
    if (config === undefined) {
      return { ok: false, reason: "point_disabled" };
    }

    const state = this.#pointStates.get(pointId);
    if (state === undefined) {
      return { ok: false, reason: "point_disabled" };
    }

    const groupConfig = this.#groupConfigs.get(config.groupId);
    if (groupConfig === undefined) {
      return { ok: false, reason: "group_not_found" };
    }

    // Gather group point states
    const groupPointStates = this.#getGroupPointStates(config.groupId);

    const condition = evaluateSpawnConditions(
      config,
      state,
      groupConfig,
      this.#runtime,
      groupPointStates,
      currentTick,
    );

    if (!condition.ok) {
      this.events.publish("spawnDenied", {
        spawnPointId: pointId,
        reason: condition.reason,
      });
      return condition;
    }

    // Spawn via MonsterRuntime
    const spawnResult = this.#runtime.spawn(config.definitionId);
    if (!spawnResult.ok) {
      this.events.publish("spawnDenied", {
        spawnPointId: pointId,
        reason: "spawn_failed",
      });
      return { ok: false, reason: "spawn_failed" };
    }

    // Update state
    this.#pointStates.set(pointId, {
      activeInstanceId: spawnResult.value.instanceId,
      respawnStartTick: undefined,
    });

    this.events.publish("spawnPointSpawned", {
      spawnPointId: pointId,
      groupId: config.groupId,
      instanceId: spawnResult.value.instanceId,
      definitionId: config.definitionId,
    });

    return { ok: true };
  }

  #onMonsterDied(instanceId: MonsterInstanceId): void {
    // Find the spawn point that owns this instance and mark for respawn
    for (const [pointId, state] of this.#pointStates) {
      if (state.activeInstanceId === instanceId) {
        this.#pendingRespawns.add(pointId);
        break;
      }
    }
  }

  #getGroupPointStates(groupId: SpawnGroupId): ReadonlyMap<string, SpawnPointState> {
    const result = new Map<string, SpawnPointState>();
    for (const [pointId, config] of this.#pointConfigs) {
      if (config.groupId !== groupId) continue;
      const state = this.#pointStates.get(pointId);
      if (state !== undefined) {
        result.set(pointId, state);
      }
    }
    return result;
  }
}
