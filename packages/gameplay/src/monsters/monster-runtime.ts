import { EventBus } from "@game/core";
import type { MonsterInstance } from "./monster-instance.js";
import type { MonsterEventMap } from "./monster-events.js";
import type { MonsterFactory } from "./monster-factory.js";
import type {
  MonsterDefinitionId,
  MonsterInstanceData,
  MonsterInstanceId,
  MonsterResult,
  MonsterState,
} from "./types.js";

/**
 * Manages the lifecycle of all active monster instances.
 * Emits events on state changes. Pure gameplay — no React/Phaser dependency.
 */
export class MonsterRuntime {
  readonly events: EventBus<MonsterEventMap> = new EventBus<MonsterEventMap>();
  readonly #factory: MonsterFactory;
  readonly #instances = new Map<MonsterInstanceId, MonsterInstance>();

  constructor(factory: MonsterFactory) {
    this.#factory = factory;
  }

  // ── Spawning ──────────────────────────────────────────────────────────────

  spawn(definitionId: MonsterDefinitionId): MonsterResult<MonsterInstanceData> {
    const result = this.#factory.create(definitionId);
    if (!result.ok) {
      return result;
    }

    const instance = result.value;
    this.#instances.set(instance.instanceId, instance);

    this.events.publish("monsterSpawned", {
      instanceId: instance.instanceId,
      definitionId: instance.definitionId,
      entityId: instance.entityId,
      name: instance.name,
      tier: instance.tier,
    });

    return { ok: true, value: instance.toData() };
  }

  // ── State transitions ─────────────────────────────────────────────────────

  kill(instanceId: MonsterInstanceId): MonsterResult<MonsterState> {
    return this.#transitionTo(instanceId, "dead");
  }

  despawn(instanceId: MonsterInstanceId): MonsterResult<MonsterState> {
    return this.#transitionTo(instanceId, "despawned");
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  getInstance(instanceId: MonsterInstanceId): MonsterResult<MonsterInstanceData> {
    const instance = this.#instances.get(instanceId);
    if (instance === undefined) {
      return { ok: false, reason: "instance_not_found" };
    }
    return { ok: true, value: instance.toData() };
  }

  getAliveInstances(): readonly MonsterInstanceData[] {
    const result: MonsterInstanceData[] = [];
    for (const instance of this.#instances.values()) {
      if (instance.isAlive()) {
        result.push(instance.toData());
      }
    }
    return result;
  }

  getAllInstances(): readonly MonsterInstanceData[] {
    const result: MonsterInstanceData[] = [];
    for (const instance of this.#instances.values()) {
      result.push(instance.toData());
    }
    return result;
  }

  activeCount(): number {
    let count = 0;
    for (const instance of this.#instances.values()) {
      if (instance.isAlive()) {
        count += 1;
      }
    }
    return count;
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  /** Removes all despawned instances from the registry. */
  purge(): number {
    let purged = 0;
    for (const [id, instance] of this.#instances) {
      if (instance.isDespawned()) {
        this.#instances.delete(id);
        purged += 1;
      }
    }
    return purged;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #transitionTo(
    instanceId: MonsterInstanceId,
    newState: MonsterState,
  ): MonsterResult<MonsterState> {
    const instance = this.#instances.get(instanceId);
    if (instance === undefined) {
      return { ok: false, reason: "instance_not_found" };
    }

    const previousState = instance.state;
    const result = instance.transition(newState);
    if (!result.ok) {
      return result;
    }

    this.events.publish("monsterStateChanged", {
      instanceId,
      entityId: instance.entityId,
      previousState,
      newState,
    });

    if (newState === "dead") {
      this.events.publish("monsterDied", {
        instanceId,
        entityId: instance.entityId,
      });
    }

    if (newState === "despawned") {
      this.events.publish("monsterDespawned", {
        instanceId,
        entityId: instance.entityId,
      });
    }

    return result;
  }
}
