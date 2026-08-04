import { EventBus } from "@game/core";
import type { ResourceEventMap } from "./resource-events.js";
import type { ResourceId, ResourceInstance } from "./resource-types.js";
import { canTransition } from "./resource-lifecycle.js";

/**
 * Manages live {@link ResourceInstance}s and emits events on state changes.
 */
export class ResourceRuntime {
  readonly #instances = new Map<ResourceId, ResourceInstance>();
  readonly events = new EventBus<ResourceEventMap>();

  add(instance: ResourceInstance): void {
    if (this.#instances.has(instance.id)) {
      throw new Error(`Resource instance "${instance.id}" already tracked`);
    }
    this.#instances.set(instance.id, instance);
    this.events.publish("resourceCreated", {
      resourceId: instance.id,
      definitionId: instance.definitionId,
      family: instance.family,
      tier: instance.tier,
    });
  }

  get(id: ResourceId): ResourceInstance | undefined {
    return this.#instances.get(id);
  }

  /**
   * Reduces current charges by 1. Transitions to `"depleted"` when charges
   * reach 0. Charges never go negative.
   *
   * @returns `true` if the harvest succeeded.
   */
  harvest(id: ResourceId): boolean {
    const instance = this.#instances.get(id);
    if (instance === undefined) {
      return false;
    }
    if (instance.state !== "available") {
      return false;
    }
    if (instance.currentCharges <= 0) {
      return false;
    }

    const newCharges = instance.currentCharges - 1;
    const depleted = newCharges === 0;

    const updated: ResourceInstance = {
      ...instance,
      currentCharges: newCharges,
      state: depleted ? "depleted" : instance.state,
    };
    this.#instances.set(id, updated);

    this.events.publish("resourceHarvested", {
      resourceId: instance.id,
      definitionId: instance.definitionId,
      currentCharges: newCharges,
      maxCharges: instance.maxCharges,
    });

    if (depleted) {
      this.events.publish("resourceStateChanged", {
        resourceId: instance.id,
        previousState: "available",
        newState: "depleted",
      });
      this.events.publish("resourceDepleted", {
        resourceId: instance.id,
        definitionId: instance.definitionId,
      });
    }

    return true;
  }

  /**
   * Restores full charges and transitions back to `"available"`.
   */
  restore(id: ResourceId): boolean {
    const instance = this.#instances.get(id);
    if (instance === undefined) {
      return false;
    }
    if (!canTransition(instance.state, "available")) {
      return false;
    }

    const updated: ResourceInstance = {
      ...instance,
      currentCharges: instance.maxCharges,
      state: "available",
    };
    this.#instances.set(id, updated);

    this.events.publish("resourceStateChanged", {
      resourceId: instance.id,
      previousState: instance.state,
      newState: "available",
    });
    this.events.publish("resourceRestored", {
      resourceId: instance.id,
      definitionId: instance.definitionId,
    });

    return true;
  }

  /**
   * Removes a resource instance and transitions to `"destroyed"`.
   */
  destroy(id: ResourceId): boolean {
    const instance = this.#instances.get(id);
    if (instance === undefined) {
      return false;
    }

    this.#instances.delete(id);

    this.events.publish("resourceStateChanged", {
      resourceId: instance.id,
      previousState: instance.state,
      newState: "destroyed",
    });
    this.events.publish("resourceDestroyed", {
      resourceId: instance.id,
      definitionId: instance.definitionId,
    });

    return true;
  }

  getByState(state: ResourceInstance["state"]): readonly ResourceInstance[] {
    return [...this.#instances.values()].filter((i) => i.state === state);
  }

  get size(): number {
    return this.#instances.size;
  }

  clear(): void {
    this.#instances.clear();
  }
}
