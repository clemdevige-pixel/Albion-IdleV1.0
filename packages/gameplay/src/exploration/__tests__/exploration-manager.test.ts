import { describe, it, expect, beforeEach, vi } from "vitest";
import { ExplorationManager } from "../exploration-manager.js";
import { asZoneDefinitionId } from "../../zones/zone-types.js";

const ZONE_A = asZoneDefinitionId("zone_a");
const ZONE_B = asZoneDefinitionId("zone_b");

describe("ExplorationManager", () => {
  let manager: ExplorationManager;

  beforeEach(() => {
    manager = new ExplorationManager();
  });

  it("first visit emits zoneDiscovered", () => {
    const handler = vi.fn();
    manager.events.subscribe("zoneDiscovered", handler);

    manager.enterZone(ZONE_A, 10);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({
      zoneDefId: ZONE_A,
      firstDiscoveredAt: 10,
      visitCount: 1,
      lastVisitedAt: 10,
    });
  });

  it("revisit emits zoneRevisited and increments visitCount", () => {
    const revisitHandler = vi.fn();
    manager.enterZone(ZONE_A, 10);

    manager.events.subscribe("zoneRevisited", revisitHandler);
    manager.enterZone(ZONE_A, 20);

    expect(revisitHandler).toHaveBeenCalledOnce();
    expect(revisitHandler).toHaveBeenCalledWith({
      zoneDefId: ZONE_A,
      firstDiscoveredAt: 10,
      visitCount: 2,
      lastVisitedAt: 20,
    });
  });

  it("emits explorationStateChanged on every enter", () => {
    const handler = vi.fn();
    manager.events.subscribe("explorationStateChanged", handler);

    manager.enterZone(ZONE_A, 1);
    manager.enterZone(ZONE_A, 2);

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("isDiscovered returns correct value", () => {
    expect(manager.isDiscovered(ZONE_A)).toBe(false);
    manager.enterZone(ZONE_A, 1);
    expect(manager.isDiscovered(ZONE_A)).toBe(true);
    expect(manager.isDiscovered(ZONE_B)).toBe(false);
  });

  it("getDiscovery returns record or undefined", () => {
    expect(manager.getDiscovery(ZONE_A)).toBeUndefined();
    manager.enterZone(ZONE_A, 5);
    expect(manager.getDiscovery(ZONE_A)).toEqual({
      zoneDefId: ZONE_A,
      firstDiscoveredAt: 5,
      visitCount: 1,
      lastVisitedAt: 5,
    });
  });

  it("getDiscoveredZones returns all discovered zone ids", () => {
    manager.enterZone(ZONE_A, 1);
    manager.enterZone(ZONE_B, 2);
    expect(manager.getDiscoveredZones()).toEqual(
      expect.arrayContaining([ZONE_A, ZONE_B]),
    );
    expect(manager.getDiscoveredZones()).toHaveLength(2);
  });

  it("getDiscoveryCount reflects number of unique zones", () => {
    expect(manager.getDiscoveryCount()).toBe(0);
    manager.enterZone(ZONE_A, 1);
    expect(manager.getDiscoveryCount()).toBe(1);
    manager.enterZone(ZONE_A, 2);
    expect(manager.getDiscoveryCount()).toBe(1);
    manager.enterZone(ZONE_B, 3);
    expect(manager.getDiscoveryCount()).toBe(2);
  });

  it("save/load roundtrip preserves state", () => {
    manager.enterZone(ZONE_A, 10);
    manager.enterZone(ZONE_B, 20);
    manager.enterZone(ZONE_A, 30);

    const saved = manager.getState();

    const manager2 = new ExplorationManager();
    manager2.loadState(saved);

    expect(manager2.isDiscovered(ZONE_A)).toBe(true);
    expect(manager2.isDiscovered(ZONE_B)).toBe(true);
    expect(manager2.getDiscovery(ZONE_A)?.visitCount).toBe(2);
    expect(manager2.getDiscovery(ZONE_A)?.lastVisitedAt).toBe(30);
    expect(manager2.getDiscoveryCount()).toBe(2);
  });

  it("save state is JSON-serializable (no Maps)", () => {
    manager.enterZone(ZONE_A, 1);
    const saved = manager.getState();
    const json = JSON.stringify(saved);
    const parsed = JSON.parse(json) as typeof saved;
    expect(Array.isArray(parsed.discoveries)).toBe(true);
  });

  it("clear resets all discoveries", () => {
    manager.enterZone(ZONE_A, 1);
    manager.enterZone(ZONE_B, 2);
    manager.clear();
    expect(manager.getDiscoveryCount()).toBe(0);
    expect(manager.isDiscovered(ZONE_A)).toBe(false);
  });
});
