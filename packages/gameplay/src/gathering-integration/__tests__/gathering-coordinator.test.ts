import { describe, it, expect, beforeEach } from "vitest";
import { GatheringCoordinator } from "../gathering-coordinator.js";
import { GatheringManager, _resetGatheringSessionCounter } from "../../gathering/gathering-manager.js";
import { ResourceNodeManager, _resetNodeCounter } from "../../resource-nodes/resource-node-manager.js";
import { ResourceNodeRegistry } from "../../resource-nodes/resource-node-registry.js";
import { ResourceRuntime } from "../../resources/resource-runtime.js";
import { ResourceRegistry } from "../../resources/resource-registry.js";
import { GatheringToolRegistry } from "../../gathering-tools/gathering-tool-registry.js";
import { asResourceDefinitionId, asResourceId } from "../../resources/resource-types.js";
import { asResourceNodeDefinitionId } from "../../resource-nodes/resource-node-types.js";
import { asGatheringToolId } from "../../gathering-tools/gathering-tool-types.js";
import type { ResourceDefinition, ResourceInstance } from "../../resources/resource-types.js";
import type { ResourceNodeDefinition } from "../../resource-nodes/resource-node-types.js";
import type { GatheringToolDefinition } from "../../gathering-tools/gathering-tool-types.js";
import type { ZoneDefinitionId } from "../../zones/zone-types.js";
import type { GatheringCycleResult } from "../gathering-integration-types.js";

const ZONE_ID = "zone-1" as ZoneDefinitionId;
const RES_DEF_ID = asResourceDefinitionId("wood-t2");
const RES_ID = asResourceId("res-1");
const NODE_DEF_ID = asResourceNodeDefinitionId("node-def-1");
const BASE_GATHER_TIME_TICKS = 3;

const RESOURCE_DEF: ResourceDefinition = {
  id: RES_DEF_ID,
  name: "Birch Log",
  family: "Wood",
  tier: 2,
  maxCharges: 3,
  respawnDurationTicks: 30,
  baseYield: 5,
  tags: [],
};

const NODE_DEF: ResourceNodeDefinition = {
  id: NODE_DEF_ID,
  name: "Birch Tree",
  resourceDefinitionId: RES_DEF_ID,
  requiredToolTier: 2,
  tags: [],
};

const AXE_T2: GatheringToolDefinition = {
  id: asGatheringToolId("axe-t2"),
  name: "Journeyman Axe",
  toolType: "axe",
  tier: 2,
  speedModifier: 1.0,
  yieldModifier: 1.0,
  tags: [],
};

const PICKAXE_T2: GatheringToolDefinition = {
  id: asGatheringToolId("pick-t2"),
  name: "Journeyman Pickaxe",
  toolType: "pickaxe",
  tier: 2,
  speedModifier: 1.0,
  yieldModifier: 1.0,
  tags: [],
};

const AXE_T1: GatheringToolDefinition = {
  id: asGatheringToolId("axe-t1"),
  name: "Beginner Axe",
  toolType: "axe",
  tier: 1,
  speedModifier: 1.2,
  yieldModifier: 1.0,
  tags: [],
};

function makeResource(charges = 3): ResourceInstance {
  return {
    id: RES_ID,
    definitionId: RES_DEF_ID,
    state: "available",
    currentCharges: charges,
    maxCharges: 3,
    tier: 2,
    family: "Wood",
  };
}

describe("GatheringCoordinator", () => {
  let resourceRegistry: ResourceRegistry;
  let resourceRuntime: ResourceRuntime;
  let nodeRegistry: ResourceNodeRegistry;
  let nodeManager: ResourceNodeManager;
  let gatheringManager: GatheringManager;
  let toolRegistry: GatheringToolRegistry;
  let coordinator: GatheringCoordinator;

  beforeEach(() => {
    _resetGatheringSessionCounter();
    _resetNodeCounter();

    resourceRegistry = new ResourceRegistry();
    resourceRegistry.register(RESOURCE_DEF);

    resourceRuntime = new ResourceRuntime();
    resourceRuntime.add(makeResource());

    nodeRegistry = new ResourceNodeRegistry();
    nodeRegistry.register(NODE_DEF);

    nodeManager = new ResourceNodeManager();
    nodeManager.createNode(NODE_DEF_ID, ZONE_ID, RES_ID);

    gatheringManager = new GatheringManager(resourceRegistry);

    toolRegistry = new GatheringToolRegistry();
    toolRegistry.register(AXE_T2);
    toolRegistry.register(PICKAXE_T2);
    toolRegistry.register(AXE_T1);

    coordinator = new GatheringCoordinator(
      resourceRegistry,
      resourceRuntime,
      nodeRegistry,
      nodeManager,
      gatheringManager,
      toolRegistry,
    );
  });

  it("startGathering succeeds with valid tool", () => {
    const node = nodeManager.getNodesByZone(ZONE_ID)[0]!;
    const result = coordinator.startGathering(node.id, [AXE_T2], 0, BASE_GATHER_TIME_TICKS);

    expect(result.ok).toBe(true);
  });

  it("startGathering fails with no matching tool", () => {
    const node = nodeManager.getNodesByZone(ZONE_ID)[0]!;
    const result = coordinator.startGathering(node.id, [PICKAXE_T2], 0, BASE_GATHER_TIME_TICKS);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("No tool provided");
    }
  });

  it("startGathering fails with insufficient tier tool", () => {
    const node = nodeManager.getNodesByZone(ZONE_ID)[0]!;
    const result = coordinator.startGathering(node.id, [AXE_T1], 0, BASE_GATHER_TIME_TICKS);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("below required tier");
    }
  });

  it("uses the authored gather duration independently from resource respawn", () => {
    const node = nodeManager.getNodesByZone(ZONE_ID)[0]!;
    coordinator.startGathering(node.id, [AXE_T2], 0, 5);

    coordinator.tick(3);
    expect(coordinator.getActiveSession()).toBeDefined();

    coordinator.tick(5);
    expect(coordinator.getActiveSession()).toBeUndefined();
  });

  it("tick completes gathering session", () => {
    const node = nodeManager.getNodesByZone(ZONE_ID)[0]!;
    coordinator.startGathering(node.id, [AXE_T2], 0, BASE_GATHER_TIME_TICKS);

    expect(coordinator.getActiveSession()).toBeDefined();

    coordinator.tick(1);
    coordinator.tick(2);
    coordinator.tick(3);

    expect(coordinator.getActiveSession()).toBeUndefined();
    expect(coordinator.getLastResult()).toBeDefined();
  });

  it("tick harvests resource and exhausts node when depleted", () => {
    resourceRuntime.clear();
    resourceRuntime.add(makeResource(1));

    const node = nodeManager.getNodesByZone(ZONE_ID)[0]!;
    coordinator.startGathering(node.id, [AXE_T2], 0, BASE_GATHER_TIME_TICKS);

    coordinator.tick(1);
    coordinator.tick(2);
    coordinator.tick(3);

    const result = coordinator.getLastResult();
    expect(result).toBeDefined();
    expect(result!.nodeExhausted).toBe(true);

    const updatedNode = nodeManager.getNode(node.id);
    expect(updatedNode!.state).toBe("exhausted");
  });

  it("full cycle: start -> tick to completion -> result available", () => {
    const cycleResults: GatheringCycleResult[] = [];
    coordinator.events.subscribe("gatheringCycleCompleted", (r) => {
      cycleResults.push(r);
    });

    const node = nodeManager.getNodesByZone(ZONE_ID)[0]!;
    const startResult = coordinator.startGathering(node.id, [AXE_T2], 0, BASE_GATHER_TIME_TICKS);
    expect(startResult.ok).toBe(true);

    coordinator.tick(1);
    coordinator.tick(2);
    coordinator.tick(3);

    expect(cycleResults).toHaveLength(1);
    const cycle = cycleResults[0]!;
    expect(cycle.nodeId).toBe(node.id);
    expect(cycle.resourceFamily).toBe("Wood");
    expect(cycle.resourceTier).toBe(2);
    expect(cycle.quantityGathered).toBeGreaterThanOrEqual(1);
    expect(cycle.toolUsed).toBe(AXE_T2.id);

    const lastResult = coordinator.getLastResult();
    expect(lastResult).toBeDefined();
    expect(lastResult!.resourceFamily).toBe("Wood");
  });

  it("dispose cleans up event subscriptions", () => {
    coordinator.dispose();

    const node = nodeManager.getNodesByZone(ZONE_ID)[0]!;

    const cycleResults: GatheringCycleResult[] = [];
    coordinator.events.subscribe("gatheringCycleCompleted", (r) => {
      cycleResults.push(r);
    });

    coordinator.startGathering(node.id, [AXE_T2], 0, BASE_GATHER_TIME_TICKS);
    coordinator.tick(1);
    coordinator.tick(2);
    coordinator.tick(3);

    expect(cycleResults).toHaveLength(0);
  });
});
