import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorldProgressionManager } from "../world-progression-manager.js";
import { asZoneDefinitionId } from "../../zones/zone-types.js";
import type { ZoneUnlockDefinition, UnlockEvaluationContext } from "../world-progression-types.js";

const ZONE_A = asZoneDefinitionId("zone-a");
const ZONE_B = asZoneDefinitionId("zone-b");
const ZONE_C = asZoneDefinitionId("zone-c");

function makeContext(overrides: Partial<UnlockEvaluationContext> = {}): UnlockEvaluationContext {
  return {
    currentTier: 1,
    currentFame: 0,
    completedZones: new Set(),
    ...overrides,
  };
}

describe("WorldProgressionManager", () => {
  let mgr: WorldProgressionManager;

  beforeEach(() => {
    mgr = new WorldProgressionManager();
  });

  // -----------------------------------------------------------------------
  // Registration & defaults
  // -----------------------------------------------------------------------

  it("registers a zone and unlocks by default when flagged", () => {
    const def: ZoneUnlockDefinition = {
      zoneDefId: ZONE_A,
      conditions: [],
      unlockedByDefault: true,
    };
    mgr.registerUnlockDefinition(def);
    expect(mgr.isUnlocked(ZONE_A)).toBe(true);
    expect(mgr.getUnlockedZones()).toContain(ZONE_A);
  });

  it("does not unlock by default when flag is missing", () => {
    mgr.registerUnlockDefinition({ zoneDefId: ZONE_A, conditions: [] });
    expect(mgr.isUnlocked(ZONE_A)).toBe(false);
    expect(mgr.getLockedZones()).toContain(ZONE_A);
  });

  // -----------------------------------------------------------------------
  // Condition-based unlock
  // -----------------------------------------------------------------------

  it("unlocks a zone when tier condition is met via checkAndUnlock", () => {
    mgr.registerUnlockDefinition({
      zoneDefId: ZONE_B,
      conditions: [{ type: "tier_reached", requiredTier: 3 }],
    });

    mgr.checkAndUnlock(makeContext({ currentTier: 2 }));
    expect(mgr.isUnlocked(ZONE_B)).toBe(false);

    mgr.checkAndUnlock(makeContext({ currentTier: 3 }));
    expect(mgr.isUnlocked(ZONE_B)).toBe(true);
  });

  it("unlocks a zone when fame condition is met", () => {
    mgr.registerUnlockDefinition({
      zoneDefId: ZONE_C,
      conditions: [{ type: "fame_reached", requiredFame: 500 }],
    });

    mgr.checkAndUnlock(makeContext({ currentFame: 499 }));
    expect(mgr.isUnlocked(ZONE_C)).toBe(false);

    mgr.checkAndUnlock(makeContext({ currentFame: 500 }));
    expect(mgr.isUnlocked(ZONE_C)).toBe(true);
  });

  // -----------------------------------------------------------------------
  // markCompleted triggers unlock check
  // -----------------------------------------------------------------------

  it("markCompleted triggers zone_completed condition check", () => {
    mgr.registerUnlockDefinition({ zoneDefId: ZONE_A, conditions: [], unlockedByDefault: true });
    mgr.registerUnlockDefinition({
      zoneDefId: ZONE_B,
      conditions: [{ type: "zone_completed", targetZoneDefId: ZONE_A }],
    });

    expect(mgr.isUnlocked(ZONE_B)).toBe(false);
    mgr.markCompleted(ZONE_A);
    expect(mgr.isUnlocked(ZONE_B)).toBe(true);
    expect(mgr.getCompletedZones()).toContain(ZONE_A);
  });

  it("markCompleted is idempotent", () => {
    mgr.registerUnlockDefinition({ zoneDefId: ZONE_A, conditions: [], unlockedByDefault: true });
    mgr.markCompleted(ZONE_A);
    mgr.markCompleted(ZONE_A);
    expect(mgr.getCompletedZones()).toEqual([ZONE_A]);
  });

  // -----------------------------------------------------------------------
  // Manual unlock (never auto-satisfied)
  // -----------------------------------------------------------------------

  it("manual condition zones are never auto-unlocked", () => {
    mgr.registerUnlockDefinition({
      zoneDefId: ZONE_A,
      conditions: [{ type: "manual" }],
    });
    mgr.checkAndUnlock(makeContext({ currentTier: 99, currentFame: 99999 }));
    expect(mgr.isUnlocked(ZONE_A)).toBe(false);
  });

  // -----------------------------------------------------------------------
  // State save / load
  // -----------------------------------------------------------------------

  it("getSaveState returns arrays, loadState restores them", () => {
    mgr.registerUnlockDefinition({ zoneDefId: ZONE_A, conditions: [], unlockedByDefault: true });
    mgr.registerUnlockDefinition({ zoneDefId: ZONE_B, conditions: [] });
    mgr.markCompleted(ZONE_A);

    const save = mgr.getSaveState();
    expect(Array.isArray(save.unlockedZones)).toBe(true);
    expect(Array.isArray(save.completedZones)).toBe(true);

    const mgr2 = new WorldProgressionManager();
    mgr2.loadState(save);
    expect(mgr2.isUnlocked(ZONE_A)).toBe(true);
    expect(mgr2.getCompletedZones()).toContain(ZONE_A);
  });

  // -----------------------------------------------------------------------
  // Clear
  // -----------------------------------------------------------------------

  it("clear resets all state", () => {
    mgr.registerUnlockDefinition({ zoneDefId: ZONE_A, conditions: [], unlockedByDefault: true });
    mgr.markCompleted(ZONE_A);
    mgr.clear();

    expect(mgr.getUnlockedZones()).toEqual([]);
    expect(mgr.getCompletedZones()).toEqual([]);
    expect(mgr.getLockedZones()).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  it("emits zoneUnlocked when a zone is unlocked", () => {
    const handler = vi.fn();
    mgr.events.subscribe("zoneUnlocked", handler);

    mgr.registerUnlockDefinition({ zoneDefId: ZONE_A, conditions: [], unlockedByDefault: true });
    expect(handler).toHaveBeenCalledWith({ zoneDefId: ZONE_A });
  });

  it("emits zoneCompleted when a zone is completed", () => {
    const handler = vi.fn();
    mgr.events.subscribe("zoneCompleted", handler);

    mgr.registerUnlockDefinition({ zoneDefId: ZONE_A, conditions: [], unlockedByDefault: true });
    mgr.markCompleted(ZONE_A);
    expect(handler).toHaveBeenCalledWith({ zoneDefId: ZONE_A });
  });

  it("emits progressionStateChanged on markCompleted", () => {
    const handler = vi.fn();
    mgr.events.subscribe("progressionStateChanged", handler);

    mgr.registerUnlockDefinition({ zoneDefId: ZONE_A, conditions: [], unlockedByDefault: true });
    mgr.markCompleted(ZONE_A);
    expect(handler).toHaveBeenCalledWith({ unlockedCount: 1, completedCount: 1 });
  });

  it("emits progressionStateChanged on loadState", () => {
    const handler = vi.fn();
    mgr.events.subscribe("progressionStateChanged", handler);

    mgr.loadState({ unlockedZones: [ZONE_A, ZONE_B], completedZones: [ZONE_A] });
    expect(handler).toHaveBeenCalledWith({ unlockedCount: 2, completedCount: 1 });
  });
});
