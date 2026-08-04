import { EventBus } from "@game/core";
import type { ResourceId } from "../resources/resource-types.js";
import type { ZoneDefinitionId } from "../zones/zone-types.js";
import type { ResourceNodeEventMap } from "./resource-node-events.js";
import type {
  ResourceNodeDefinitionId,
  ResourceNodeId,
  ResourceNodeInstance,
  ResourceNodeState,
} from "./resource-node-types.js";
import { asResourceNodeId } from "./resource-node-types.js";

let nodeCounter = 0;

/** @internal — for test cleanup only */
export function _resetNodeCounter(): void {
  nodeCounter = 0;
}

/**
 * Manages live {@link ResourceNodeInstance}s and emits events on state changes.
 */
export class ResourceNodeManager {
  readonly #nodes = new Map<ResourceNodeId, ResourceNodeInstance>();
  readonly events = new EventBus<ResourceNodeEventMap>();

  createNode(
    definitionId: ResourceNodeDefinitionId,
    zoneDefId: ZoneDefinitionId,
    resourceId: ResourceId,
  ): ResourceNodeInstance {
    nodeCounter += 1;
    const id = asResourceNodeId(`rnode-${nodeCounter}`);

    const node: ResourceNodeInstance = {
      id,
      definitionId,
      zoneDefId,
      resourceId,
      state: "active",
    };

    this.#nodes.set(id, node);

    this.events.publish("nodeCreated", {
      nodeId: id,
      definitionId,
    });

    return node;
  }

  getNode(id: ResourceNodeId): ResourceNodeInstance | undefined {
    return this.#nodes.get(id);
  }

  getNodesByZone(zoneDefId: ZoneDefinitionId): readonly ResourceNodeInstance[] {
    return [...this.#nodes.values()].filter((n) => n.zoneDefId === zoneDefId);
  }

  getNodesByState(state: ResourceNodeState): readonly ResourceNodeInstance[] {
    return [...this.#nodes.values()].filter((n) => n.state === state);
  }

  exhaust(id: ResourceNodeId): boolean {
    return this.#transition(id, "active", "exhausted", "nodeExhausted");
  }

  reactivate(id: ResourceNodeId): boolean {
    return this.#transition(id, "exhausted", "active", "nodeReactivated");
  }

  disable(id: ResourceNodeId): boolean {
    const node = this.#nodes.get(id);
    if (node === undefined) return false;
    if (node.state === "disabled") return false;

    const previousState = node.state;
    const updated: ResourceNodeInstance = { ...node, state: "disabled" };
    this.#nodes.set(id, updated);

    this.events.publish("nodeStateChanged", {
      nodeId: id,
      previousState,
      newState: "disabled",
    });
    this.events.publish("nodeDisabled", {
      nodeId: id,
      definitionId: node.definitionId,
    });

    return true;
  }

  destroyNode(id: ResourceNodeId): boolean {
    const node = this.#nodes.get(id);
    if (node === undefined) return false;

    this.#nodes.delete(id);

    this.events.publish("nodeDestroyed", {
      nodeId: id,
      definitionId: node.definitionId,
    });

    return true;
  }

  get size(): number {
    return this.#nodes.size;
  }

  clear(): void {
    this.#nodes.clear();
  }

  #transition(
    id: ResourceNodeId,
    expectedFrom: ResourceNodeState,
    to: ResourceNodeState,
    eventName: "nodeExhausted" | "nodeReactivated",
  ): boolean {
    const node = this.#nodes.get(id);
    if (node === undefined) return false;
    if (node.state !== expectedFrom) return false;

    const updated: ResourceNodeInstance = { ...node, state: to };
    this.#nodes.set(id, updated);

    this.events.publish("nodeStateChanged", {
      nodeId: id,
      previousState: expectedFrom,
      newState: to,
    });
    this.events.publish(eventName, {
      nodeId: id,
      definitionId: node.definitionId,
    });

    return true;
  }
}
