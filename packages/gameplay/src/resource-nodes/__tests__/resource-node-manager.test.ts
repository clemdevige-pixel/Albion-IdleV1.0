import { describe, it, expect, beforeEach, vi } from "vitest";
import { ResourceNodeManager, _resetNodeCounter } from "../resource-node-manager.js";
import { asResourceNodeDefinitionId } from "../resource-node-types.js";
import { asResourceId } from "../../resources/resource-types.js";
import { asZoneDefinitionId } from "../../zones/zone-types.js";

const defId = asResourceNodeDefinitionId("nodedef-1");
const zoneId = asZoneDefinitionId("zone-1");
const zoneId2 = asZoneDefinitionId("zone-2");
const resId = asResourceId("res-1");

describe("ResourceNodeManager", () => {
  let manager: ResourceNodeManager;

  beforeEach(() => {
    _resetNodeCounter();
    manager = new ResourceNodeManager();
  });

  it("creates a node in active state", () => {
    const node = manager.createNode(defId, zoneId, resId);
    expect(node.state).toBe("active");
    expect(node.definitionId).toBe(defId);
    expect(node.zoneDefId).toBe(zoneId);
    expect(node.resourceId).toBe(resId);
    expect(manager.size).toBe(1);
  });

  it("getNode retrieves by id", () => {
    const node = manager.createNode(defId, zoneId, resId);
    expect(manager.getNode(node.id)).toEqual(node);
  });

  it("getNodesByZone filters correctly", () => {
    manager.createNode(defId, zoneId, resId);
    manager.createNode(defId, zoneId2, resId);
    manager.createNode(defId, zoneId, resId);
    expect(manager.getNodesByZone(zoneId)).toHaveLength(2);
    expect(manager.getNodesByZone(zoneId2)).toHaveLength(1);
  });

  it("getNodesByState filters correctly", () => {
    const n1 = manager.createNode(defId, zoneId, resId);
    manager.createNode(defId, zoneId, resId);
    manager.exhaust(n1.id);
    expect(manager.getNodesByState("active")).toHaveLength(1);
    expect(manager.getNodesByState("exhausted")).toHaveLength(1);
  });

  it("exhaust transitions active to exhausted", () => {
    const node = manager.createNode(defId, zoneId, resId);
    expect(manager.exhaust(node.id)).toBe(true);
    expect(manager.getNode(node.id)?.state).toBe("exhausted");
  });

  it("exhaust returns false for non-active node", () => {
    const node = manager.createNode(defId, zoneId, resId);
    manager.exhaust(node.id);
    expect(manager.exhaust(node.id)).toBe(false);
  });

  it("reactivate transitions exhausted to active", () => {
    const node = manager.createNode(defId, zoneId, resId);
    manager.exhaust(node.id);
    expect(manager.reactivate(node.id)).toBe(true);
    expect(manager.getNode(node.id)?.state).toBe("active");
  });

  it("reactivate returns false for active node", () => {
    const node = manager.createNode(defId, zoneId, resId);
    expect(manager.reactivate(node.id)).toBe(false);
  });

  it("disable transitions any non-disabled state to disabled", () => {
    const n1 = manager.createNode(defId, zoneId, resId);
    expect(manager.disable(n1.id)).toBe(true);
    expect(manager.getNode(n1.id)?.state).toBe("disabled");
  });

  it("disable returns false for already disabled node", () => {
    const node = manager.createNode(defId, zoneId, resId);
    manager.disable(node.id);
    expect(manager.disable(node.id)).toBe(false);
  });

  it("destroyNode removes the instance", () => {
    const node = manager.createNode(defId, zoneId, resId);
    expect(manager.destroyNode(node.id)).toBe(true);
    expect(manager.getNode(node.id)).toBeUndefined();
    expect(manager.size).toBe(0);
  });

  it("destroyNode returns false for unknown id", () => {
    const node = manager.createNode(defId, zoneId, resId);
    manager.destroyNode(node.id);
    expect(manager.destroyNode(node.id)).toBe(false);
  });

  it("clear removes all nodes", () => {
    manager.createNode(defId, zoneId, resId);
    manager.createNode(defId, zoneId, resId);
    manager.clear();
    expect(manager.size).toBe(0);
  });

  describe("events", () => {
    it("emits nodeCreated on createNode", () => {
      const handler = vi.fn();
      manager.events.subscribe("nodeCreated", handler);
      const node = manager.createNode(defId, zoneId, resId);
      expect(handler).toHaveBeenCalledWith({ nodeId: node.id, definitionId: defId });
    });

    it("emits nodeExhausted and nodeStateChanged on exhaust", () => {
      const stateHandler = vi.fn();
      const exhaustHandler = vi.fn();
      manager.events.subscribe("nodeStateChanged", stateHandler);
      manager.events.subscribe("nodeExhausted", exhaustHandler);
      const node = manager.createNode(defId, zoneId, resId);
      manager.exhaust(node.id);
      expect(stateHandler).toHaveBeenCalledWith({
        nodeId: node.id,
        previousState: "active",
        newState: "exhausted",
      });
      expect(exhaustHandler).toHaveBeenCalledWith({
        nodeId: node.id,
        definitionId: defId,
      });
    });

    it("emits nodeReactivated on reactivate", () => {
      const handler = vi.fn();
      manager.events.subscribe("nodeReactivated", handler);
      const node = manager.createNode(defId, zoneId, resId);
      manager.exhaust(node.id);
      manager.reactivate(node.id);
      expect(handler).toHaveBeenCalledWith({ nodeId: node.id, definitionId: defId });
    });

    it("emits nodeDisabled on disable", () => {
      const handler = vi.fn();
      manager.events.subscribe("nodeDisabled", handler);
      const node = manager.createNode(defId, zoneId, resId);
      manager.disable(node.id);
      expect(handler).toHaveBeenCalledWith({ nodeId: node.id, definitionId: defId });
    });

    it("emits nodeDestroyed on destroyNode", () => {
      const handler = vi.fn();
      manager.events.subscribe("nodeDestroyed", handler);
      const node = manager.createNode(defId, zoneId, resId);
      manager.destroyNode(node.id);
      expect(handler).toHaveBeenCalledWith({ nodeId: node.id, definitionId: defId });
    });
  });
});
