import { EventBus } from "@game/core";
import type { ResourceNodeManager } from "../resource-nodes/resource-node-manager.js";
import type { ResourceRuntime } from "../resources/resource-runtime.js";
import type { ResourceRegistry } from "../resources/resource-registry.js";
import type { GatheringEventMap } from "./gathering-events.js";
import type {
  GatheringRequest,
  GatheringResult,
  GatheringSessionConfig,
  GatheringSessionId,
} from "./gathering-types.js";
import { asGatheringSessionId } from "./gathering-types.js";
import { GatheringSession } from "./gathering-session.js";
import { resolveGatherResult } from "./gathering-resolver.js";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type GatheringStartResult =
  | { readonly ok: true; readonly sessionId: GatheringSessionId }
  | { readonly ok: false; readonly reason: string };

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

let sessionCounter = 0;

/** @internal — for test cleanup only */
export function _resetGatheringSessionCounter(): void {
  sessionCounter = 0;
}

export class GatheringManager {
  readonly events = new EventBus<GatheringEventMap>();

  #activeSession: GatheringSession | undefined;
  #lastResult: GatheringResult | undefined;
  readonly #resourceRegistry: ResourceRegistry;

  constructor(resourceRegistry: ResourceRegistry) {
    this.#resourceRegistry = resourceRegistry;
  }

  startGathering(
    request: GatheringRequest,
    nodeManager: ResourceNodeManager,
    resourceRuntime: ResourceRuntime,
    config: GatheringSessionConfig,
  ): GatheringStartResult {
    // Only one active session at a time
    if (this.#activeSession !== undefined && this.#activeSession.state === "gathering") {
      return { ok: false, reason: "session_already_active" };
    }

    // Validate node exists
    const node = nodeManager.getNode(request.nodeId);
    if (node === undefined) {
      this.events.publish("gatherFailed", {
        nodeId: request.nodeId,
        reason: "node_not_found",
      });
      return { ok: false, reason: "node_not_found" };
    }

    // Validate node is active
    if (node.state !== "active") {
      this.events.publish("gatherFailed", {
        nodeId: request.nodeId,
        reason: "node_not_active",
      });
      return { ok: false, reason: "node_not_active" };
    }

    // Validate resource exists
    const resource = resourceRuntime.get(node.resourceId);
    if (resource === undefined) {
      this.events.publish("gatherFailed", {
        nodeId: request.nodeId,
        reason: "resource_not_found",
      });
      return { ok: false, reason: "resource_not_found" };
    }

    // Validate resource is available
    if (resource.state !== "available") {
      this.events.publish("gatherFailed", {
        nodeId: request.nodeId,
        reason: "resource_not_available",
      });
      return { ok: false, reason: "resource_not_available" };
    }

    sessionCounter += 1;
    const sessionId = asGatheringSessionId(`gather-${sessionCounter}`);

    const session = new GatheringSession(
      sessionId,
      request.nodeId,
      node.resourceId,
      config,
      request.currentTick,
    );

    this.#activeSession = session;

    this.events.publish("gatherStarted", {
      sessionId,
      nodeId: request.nodeId,
    });

    return { ok: true, sessionId };
  }

  tick(
    currentTick: number,
    nodeManager: ResourceNodeManager,
    resourceRuntime: ResourceRuntime,
  ): void {
    const session = this.#activeSession;
    if (session === undefined || session.state !== "gathering") return;

    session.tick(currentTick);

    if (session.isComplete(currentTick)) {
      this.#completeSession(session, nodeManager, resourceRuntime);
    }
  }

  advanceActiveSession(
    ticks: number,
    currentTick: number,
    nodeManager: ResourceNodeManager,
    resourceRuntime: ResourceRuntime,
  ): number {
    const session = this.#activeSession;
    if (session === undefined || session.state !== "gathering") return 0;

    const appliedTicks = session.advanceProgress(ticks, currentTick);
    if (appliedTicks <= 0) return 0;

    session.tick(currentTick);
    if (session.isComplete(currentTick)) {
      this.#completeSession(session, nodeManager, resourceRuntime);
    }
    return appliedTicks;
  }

  interruptSession(sessionId: GatheringSessionId): boolean {
    const session = this.#activeSession;
    if (session === undefined || session.id !== sessionId || session.state !== "gathering") {
      return false;
    }

    session.interrupt();

    this.events.publish("gatherInterrupted", {
      sessionId: session.id,
      nodeId: session.nodeId,
    });

    return true;
  }

  getActiveSession(): GatheringSession | undefined {
    if (this.#activeSession !== undefined && this.#activeSession.state === "gathering") {
      return this.#activeSession;
    }
    return undefined;
  }

  getLastResult(): GatheringResult | undefined {
    return this.#lastResult;
  }

  clear(): void {
    this.#activeSession = undefined;
    this.#lastResult = undefined;
  }

  #completeSession(
    session: GatheringSession,
    nodeManager: ResourceNodeManager,
    resourceRuntime: ResourceRuntime,
  ): void {
    const resourceDef = this.#resourceRegistry.get(
      resourceRuntime.get(session.resourceId)!.definitionId,
    );

    if (resourceDef === undefined) return;

    const result = resolveGatherResult(
      resourceDef,
      session.config.toolModifier,
      session.config.masteryModifier,
    );

    // Harvest reduces charges; returns true if successful
    resourceRuntime.harvest(session.resourceId);

    // Check if resource is now depleted → exhaust the node
    const updatedResource = resourceRuntime.get(session.resourceId);
    const nodeExhausted =
      updatedResource !== undefined && updatedResource.state === "depleted";

    if (nodeExhausted) {
      nodeManager.exhaust(session.nodeId);
    }

    const finalResult: GatheringResult = {
      ...result,
      nodeExhausted,
    };

    this.#lastResult = finalResult;

    this.events.publish("gatherCompleted", {
      sessionId: session.id,
      nodeId: session.nodeId,
      result: finalResult,
    });
  }
}
