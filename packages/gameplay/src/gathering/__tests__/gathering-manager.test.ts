import { describe, it, expect, beforeEach } from "vitest";
import { GatheringManager, _resetGatheringSessionCounter } from "../gathering-manager.js";
import { ResourceNodeManager, _resetNodeCounter } from "../../resource-nodes/resource-node-manager.js";
import { ResourceRuntime } from "../../resources/resource-runtime.js";
import { ResourceRegistry } from "../../resources/resource-registry.js";
import { asResourceDefinitionId, asResourceId } from "../../resources/resource-types.js";
import { asResourceNodeDefinitionId } from "../../resource-nodes/resource-node-types.js";
import type { ResourceDefinition, ResourceInstance } from "../../resources/resource-types.js";
import type { GatheringRequest, GatheringSessionConfig } from "../gathering-types.js";
import type { GatherCompletedEvent, GatherStartedEvent, GatherInterruptedEvent } from "../gathering-events.js";
import type { ZoneDefinitionId } from "../../zones/zone-types.js";

const ZONE_ID = "zone-1" as ZoneDefinitionId;
const RES_DEF_ID = asResourceDefinitionId("wood-t1");
const RES_ID = asResourceId("res-1");
const NODE_DEF_ID = asResourceNodeDefinitionId("node-def-1");

const RESOURCE_DEF: ResourceDefinition = {
  id: RES_DEF_ID,
  name: "Rough Log",
  family: "Wood",
  tier: 1,
  maxCharges: 3,
  respawnDurationTicks: 10,
  baseYield: 5,
  tags: [],
};

const DEFAULT_CONFIG: GatheringSessionConfig = {
  baseGatherTimeTicks: 3,
  toolModifier: 1,
  masteryModifier: 1,
};

function makeResource(charges = 3): ResourceInstance {
  return {
    id: RES_ID,
    definitionId: RES_DEF_ID,
    state: "available",
    currentCharges: charges,
    maxCharges: 3,
    tier: 1,
    family: "Wood",
  };
}

describe("GatheringManager", () => {
  let registry: ResourceRegistry;
  let runtime: ResourceRuntime;
  let nodeManager: ResourceNodeManager;
  let manager: GatheringManager;

  beforeEach(() => {
    _resetGatheringSessionCounter();
    _resetNodeCounter();

    registry = new ResourceRegistry();
    registry.register(RESOURCE_DEF);

    runtime = new ResourceRuntime();
    runtime.add(makeResource());

    nodeManager = new ResourceNodeManager();
    nodeManager.createNode(NODE_DEF_ID, ZONE_ID, RES_ID);

    manager = new GatheringManager(registry);
  });

  function request(tick = 0): GatheringRequest {
    return { nodeId: nodeManager.getNodesByState("active")[0]!.id, currentTick: tick };
  }

  describe("startGathering", () => {
    it("succeeds with valid node and resource", () => {
      const result = manager.startGathering(request(), nodeManager, runtime, DEFAULT_CONFIG);
      expect(result.ok).toBe(true);
    });

    it("emits gatherStarted event", () => {
      const events: GatherStartedEvent[] = [];
      manager.events.subscribe("gatherStarted", (e) => events.push(e));
      manager.startGathering(request(), nodeManager, runtime, DEFAULT_CONFIG);
      expect(events).toHaveLength(1);
    });

    it("fails when node does not exist", () => {
      const req: GatheringRequest = {
        nodeId: "nonexistent" as ReturnType<typeof request>["nodeId"],
        currentTick: 0,
      };
      const result = manager.startGathering(req, nodeManager, runtime, DEFAULT_CONFIG);
      expect(result).toEqual({ ok: false, reason: "node_not_found" });
    });

    it("fails when node is exhausted", () => {
      const node = nodeManager.getNodesByState("active")[0]!;
      nodeManager.exhaust(node.id);
      const result = manager.startGathering(
        { nodeId: node.id, currentTick: 0 },
        nodeManager,
        runtime,
        DEFAULT_CONFIG,
      );
      expect(result).toEqual({ ok: false, reason: "node_not_active" });
    });

    it("fails when resource is not available", () => {
      const node = nodeManager.getNodesByState("active")[0]!;
      // deplete the resource by harvesting all charges
      runtime.harvest(RES_ID);
      runtime.harvest(RES_ID);
      runtime.harvest(RES_ID);
      const result = manager.startGathering(
        { nodeId: node.id, currentTick: 0 },
        nodeManager,
        runtime,
        DEFAULT_CONFIG,
      );
      expect(result).toEqual({ ok: false, reason: "resource_not_available" });
    });

    it("fails when a session is already active", () => {
      manager.startGathering(request(), nodeManager, runtime, DEFAULT_CONFIG);
      const result = manager.startGathering(request(), nodeManager, runtime, DEFAULT_CONFIG);
      expect(result).toEqual({ ok: false, reason: "session_already_active" });
    });
  });

  describe("tick", () => {
    it("completes session when time elapsed", () => {
      manager.startGathering(request(0), nodeManager, runtime, DEFAULT_CONFIG);
      const events: GatherCompletedEvent[] = [];
      manager.events.subscribe("gatherCompleted", (e) => events.push(e));

      manager.tick(3, nodeManager, runtime);

      expect(events).toHaveLength(1);
      expect(events[0]!.result.resourceFamily).toBe("Wood");
      expect(events[0]!.result.quantityGathered).toBe(5);
    });

    it("does not complete before required ticks", () => {
      manager.startGathering(request(0), nodeManager, runtime, DEFAULT_CONFIG);
      const events: GatherCompletedEvent[] = [];
      manager.events.subscribe("gatherCompleted", (e) => events.push(e));

      manager.tick(2, nodeManager, runtime);

      expect(events).toHaveLength(0);
      expect(manager.getActiveSession()).toBeDefined();
    });

    it("harvest reduces charges on completion", () => {
      manager.startGathering(request(0), nodeManager, runtime, DEFAULT_CONFIG);
      manager.tick(3, nodeManager, runtime);

      const resource = runtime.get(RES_ID);
      expect(resource!.currentCharges).toBe(2);
    });

    it("exhausts node when resource is depleted", () => {
      // Resource with 1 charge
      runtime.clear();
      runtime.add(makeResource(1));

      manager.startGathering(request(0), nodeManager, runtime, DEFAULT_CONFIG);
      manager.tick(3, nodeManager, runtime);

      const result = manager.getLastResult();
      expect(result!.nodeExhausted).toBe(true);

      const node = nodeManager.getNodesByState("exhausted");
      expect(node).toHaveLength(1);
    });

    it("sets lastResult on completion", () => {
      manager.startGathering(request(0), nodeManager, runtime, DEFAULT_CONFIG);
      manager.tick(3, nodeManager, runtime);

      const result = manager.getLastResult();
      expect(result).toBeDefined();
      expect(result!.resourceFamily).toBe("Wood");
    });

    it("clears active session after completion", () => {
      manager.startGathering(request(0), nodeManager, runtime, DEFAULT_CONFIG);
      manager.tick(3, nodeManager, runtime);
      expect(manager.getActiveSession()).toBeUndefined();
    });
  });

  describe("interruptSession", () => {
    it("interrupts active session", () => {
      const startResult = manager.startGathering(request(0), nodeManager, runtime, DEFAULT_CONFIG);
      if (!startResult.ok) throw new Error("should succeed");

      const events: GatherInterruptedEvent[] = [];
      manager.events.subscribe("gatherInterrupted", (e) => events.push(e));

      const interrupted = manager.interruptSession(startResult.sessionId);
      expect(interrupted).toBe(true);
      expect(events).toHaveLength(1);
      expect(manager.getActiveSession()).toBeUndefined();
    });

    it("returns false for unknown session id", () => {
      manager.startGathering(request(0), nodeManager, runtime, DEFAULT_CONFIG);
      const result = manager.interruptSession(
        "unknown" as ReturnType<typeof request>["nodeId"] as unknown as Parameters<typeof manager.interruptSession>[0],
      );
      expect(result).toBe(false);
    });
  });

  describe("getActiveSession", () => {
    it("returns undefined when no session active", () => {
      expect(manager.getActiveSession()).toBeUndefined();
    });

    it("returns active session", () => {
      manager.startGathering(request(0), nodeManager, runtime, DEFAULT_CONFIG);
      expect(manager.getActiveSession()).toBeDefined();
    });
  });

  describe("clear", () => {
    it("resets active session and last result", () => {
      manager.startGathering(request(0), nodeManager, runtime, DEFAULT_CONFIG);
      manager.tick(3, nodeManager, runtime);
      manager.clear();
      expect(manager.getActiveSession()).toBeUndefined();
      expect(manager.getLastResult()).toBeUndefined();
    });
  });
});
