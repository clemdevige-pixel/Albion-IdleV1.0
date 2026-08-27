import { EventBus } from "@game/core";
import type { ResourceRegistry } from "../resources/resource-registry.js";
import type { ResourceRuntime } from "../resources/resource-runtime.js";
import type { ResourceNodeRegistry } from "../resource-nodes/resource-node-registry.js";
import type { ResourceNodeManager } from "../resource-nodes/resource-node-manager.js";
import type { ResourceNodeId } from "../resource-nodes/resource-node-types.js";
import type { GatheringManager, GatheringStartResult } from "../gathering/gathering-manager.js";
import type { GatheringResult } from "../gathering/gathering-types.js";
import type { GatheringSession } from "../gathering/gathering-session.js";
import type { GatheringToolRegistry } from "../gathering-tools/gathering-tool-registry.js";
import type { GatheringToolDefinition } from "../gathering-tools/gathering-tool-types.js";
import { getRequiredToolType, findMatchingTool } from "../gathering-tools/gathering-tool-resolver.js";
import { validateTool } from "../gathering-tools/gathering-tool-validator.js";
import type { GatheringIntegrationEventMap } from "./gathering-integration-events.js";
import type { GatheringCycleResult } from "./gathering-integration-types.js";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type GatheringCoordinatorResult =
  | { readonly ok: true; readonly sessionId: string }
  | { readonly ok: false; readonly reason: string };

// ---------------------------------------------------------------------------
// Coordinator
// ---------------------------------------------------------------------------

export class GatheringCoordinator {
  readonly events = new EventBus<GatheringIntegrationEventMap>();

  readonly #resourceRegistry: ResourceRegistry;
  readonly #resourceRuntime: ResourceRuntime;
  readonly #nodeRegistry: ResourceNodeRegistry;
  readonly #nodeManager: ResourceNodeManager;
  readonly #gatheringManager: GatheringManager;
  #unsubscribe: (() => void) | undefined;

  constructor(
    resourceRegistry: ResourceRegistry,
    resourceRuntime: ResourceRuntime,
    nodeRegistry: ResourceNodeRegistry,
    nodeManager: ResourceNodeManager,
    gatheringManager: GatheringManager,
    _toolRegistry: GatheringToolRegistry,
  ) {
    this.#resourceRegistry = resourceRegistry;
    this.#resourceRuntime = resourceRuntime;
    this.#nodeRegistry = nodeRegistry;
    this.#nodeManager = nodeManager;
    this.#gatheringManager = gatheringManager;
    this.#unsubscribe = this.#gatheringManager.events.subscribe(
      "gatherCompleted",
      (event) => {
        const node = this.#nodeManager.getNode(event.nodeId);
        if (node === undefined) return;

        const nodeDef = this.#nodeRegistry.get(node.definitionId);
        if (nodeDef === undefined) return;

        const toolId = this.#sessionToolMap.get(event.sessionId);
        if (toolId === undefined) return;

        const cycleResult: GatheringCycleResult = {
          nodeId: event.nodeId,
          resourceFamily: event.result.resourceFamily,
          resourceTier: event.result.resourceTier,
          quantityGathered: event.result.quantityGathered,
          toolUsed: toolId,
          nodeExhausted: event.result.nodeExhausted,
        };

        this.events.publish("gatheringCycleCompleted", cycleResult);
        this.#sessionToolMap.delete(event.sessionId);
      },
    );
  }

  readonly #sessionToolMap = new Map<string, GatheringToolDefinition["id"]>();

  startGathering(
    nodeId: ResourceNodeId,
    equippedTools: readonly GatheringToolDefinition[],
    currentTick: number,
    baseGatherTimeTicks: number,
  ): GatheringCoordinatorResult {
    const node = this.#nodeManager.getNode(nodeId);
    if (node === undefined) {
      return { ok: false, reason: "node_not_found" };
    }

    const nodeDef = this.#nodeRegistry.get(node.definitionId);
    if (nodeDef === undefined) {
      return { ok: false, reason: "node_definition_not_found" };
    }

    const resourceDef = this.#resourceRegistry.get(nodeDef.resourceDefinitionId);
    if (resourceDef === undefined) {
      return { ok: false, reason: "resource_definition_not_found" };
    }

    const requiredToolType = getRequiredToolType(resourceDef.family);
    const matchedTool = findMatchingTool(requiredToolType, equippedTools);
    const validation = validateTool(matchedTool, resourceDef.family, nodeDef.requiredToolTier);

    if (!validation.valid) {
      return { ok: false, reason: validation.reason };
    }

    const tool = matchedTool!;
    const config = {
      baseGatherTimeTicks: Math.max(1, Math.floor(baseGatherTimeTicks)),
      toolModifier: tool.speedModifier,
      masteryModifier: 1.0,
    } as const;

    const result: GatheringStartResult = this.#gatheringManager.startGathering(
      { nodeId, currentTick },
      this.#nodeManager,
      this.#resourceRuntime,
      config,
    );

    if (result.ok) {
      this.#sessionToolMap.set(result.sessionId, tool.id);
    }

    return result;
  }

  tick(currentTick: number): void {
    this.#gatheringManager.tick(currentTick, this.#nodeManager, this.#resourceRuntime);
  }

  advanceActiveSession(ticks: number, currentTick: number): number {
    return this.#gatheringManager.advanceActiveSession(
      ticks,
      currentTick,
      this.#nodeManager,
      this.#resourceRuntime,
    );
  }

  getActiveSession(): GatheringSession | undefined {
    return this.#gatheringManager.getActiveSession();
  }

  getLastResult(): GatheringResult | undefined {
    return this.#gatheringManager.getLastResult();
  }

  dispose(): void {
    if (this.#unsubscribe !== undefined) {
      this.#unsubscribe();
      this.#unsubscribe = undefined;
    }
    this.#sessionToolMap.clear();
  }
}
