import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorldLocationSaveState } from "@game/gameplay";
import { combatStopController } from "../runtime/CombatStopController";
import { WorldNavigationActions } from "./WorldNavigationActions";

function createHarness(options?: {
  readonly segmentAccepted?: boolean;
  readonly zoneAccepted?: boolean;
  readonly explorationResumed?: boolean;
  readonly farmMode?: boolean;
  readonly combatState?: "combat" | "defeat" | "idle" | "walking";
  readonly awaitingResumeAfterDefeat?: boolean;
  readonly savedDefeat?: boolean;
}) {
  const savedLocation = {
    activeZoneDefId: "zone_forest",
    activeSegment: 2,
    activeEncounter: 3,
    farmMode: false,
    zoneMemories: [],
    ...(options?.savedDefeat === true ? { awaitingResumeAfterDefeat: true } : {}),
  } as unknown as WorldLocationSaveState;
  const worldRuntime = {
    currentZoneIndex: 0,
    farmMode: options?.farmMode ?? false,
    currentSegment: 2,
    highestUnlockedSegment: 5,
    selectSegment: vi.fn(() => options?.segmentAccepted ?? true),
    queueSegmentChange: vi.fn(() => options?.segmentAccepted ?? true),
    setSegmentFarmMode: vi.fn(),
    selectZone: vi.fn(() => options?.zoneAccepted ?? true),
    changeActiveZone: vi.fn(),
    getWorldLocationSaveState: vi.fn(() => savedLocation),
    setWorldLocationSaveState: vi.fn(),
  };
  const combatRuntime = {
    interruptEncounter: vi.fn(),
    restoreHeroHealth: vi.fn(),
    resumeExploration: vi.fn(() => options?.explorationResumed ?? true),
    isAwaitingResumeAfterDefeat: vi.fn(() => options?.awaitingResumeAfterDefeat ?? false),
    restoreAwaitingResumeAfterDefeat: vi.fn(),
  };
  const bridge = {
    combatState: options?.combatState ?? "combat",
    setCombatState: vi.fn(),
    clearEnemyPresentation: vi.fn(),
  };
  const updateWorldBridge = vi.fn();
  const actions = new WorldNavigationActions({
    worldRuntime,
    combatRuntime,
    bridge: bridge as never,
    updateWorldBridge,
  });

  return { actions, worldRuntime, combatRuntime, bridge, updateWorldBridge, savedLocation };
}

afterEach(() => {
  combatStopController.reset();
});

describe("WorldNavigationActions", () => {
  it("queues an accepted manual segment change without interrupting active combat", () => {
    const harness = createHarness();

    expect(harness.actions.selectSegment(4)).toBe(true);
    expect(harness.worldRuntime.queueSegmentChange).toHaveBeenCalledWith(4);
    expect(harness.worldRuntime.selectSegment).not.toHaveBeenCalled();
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();
    expect(harness.combatRuntime.restoreHeroHealth).not.toHaveBeenCalled();
    expect(harness.bridge.setCombatState).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("applies a segment selection immediately while combat is paused", () => {
    const harness = createHarness({ combatState: "idle" });
    expect(combatStopController.requestStopAfterSegment()).toBe(true);
    expect(combatStopController.pauseAfterSegment()).toBe(true);

    expect(harness.actions.selectSegment(4)).toBe(true);
    expect(harness.worldRuntime.selectSegment).toHaveBeenCalledWith(4);
    expect(harness.worldRuntime.queueSegmentChange).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("applies a segment selection immediately after defeat and clears the stale enemy presentation", () => {
    const harness = createHarness({ combatState: "defeat" });

    expect(harness.actions.selectSegment(2)).toBe(true);
    expect(harness.worldRuntime.selectSegment).toHaveBeenCalledWith(2);
    expect(harness.worldRuntime.queueSegmentChange).not.toHaveBeenCalled();
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();
    expect(harness.bridge.clearEnemyPresentation).toHaveBeenCalledOnce();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("queues timeline travel inside the active zone during active combat", () => {
    const harness = createHarness();

    expect(harness.actions.selectZone(1, 4)).toBe(true);
    expect(harness.worldRuntime.selectZone).toHaveBeenCalledWith(1, 4);
    expect(harness.worldRuntime.selectSegment).not.toHaveBeenCalled();
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();
    expect(harness.combatRuntime.restoreHeroHealth).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("applies same-zone timeline travel immediately after defeat and clears the stale enemy presentation", () => {
    const harness = createHarness({ combatState: "defeat" });

    expect(harness.actions.selectZone(1, 4)).toBe(true);
    expect(harness.worldRuntime.selectZone).toHaveBeenCalledWith(1, 4);
    expect(harness.worldRuntime.selectSegment).toHaveBeenCalledWith(4);
    expect(harness.worldRuntime.changeActiveZone).not.toHaveBeenCalled();
    expect(harness.bridge.clearEnemyPresentation).toHaveBeenCalledOnce();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("applies validated cross-zone timeline travel immediately while paused", () => {
    const harness = createHarness({ combatState: "idle" });
    expect(combatStopController.requestStopAfterSegment()).toBe(true);
    expect(combatStopController.pauseAfterSegment()).toBe(true);

    expect(harness.actions.selectZone(3, 2)).toBe(true);
    expect(harness.worldRuntime.selectZone).toHaveBeenCalledWith(3, 2);
    expect(harness.worldRuntime.changeActiveZone).toHaveBeenCalledWith(2, 1);
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("does not alter combat when a manual segment destination is rejected", () => {
    const harness = createHarness({ segmentAccepted: false });

    expect(harness.actions.selectSegment(9)).toBe(false);
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();
    expect(harness.combatRuntime.restoreHeroHealth).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).not.toHaveBeenCalled();
  });

  it("queues accepted cross-zone travel without interrupting active combat", () => {
    const harness = createHarness();

    expect(harness.actions.selectZone(3, 2)).toBe(true);
    expect(harness.worldRuntime.selectZone).toHaveBeenCalledWith(3, 2);
    expect(harness.worldRuntime.changeActiveZone).not.toHaveBeenCalled();
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();
    expect(harness.combatRuntime.restoreHeroHealth).not.toHaveBeenCalled();
    expect(harness.bridge.setCombatState).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("clears defeated enemy presentation before exploration resumes", () => {
    const harness = createHarness({ combatState: "defeat", explorationResumed: true });

    expect(harness.actions.resumeExploration()).toBe(true);
    expect(harness.combatRuntime.resumeExploration).toHaveBeenCalledOnce();
    expect(harness.bridge.clearEnemyPresentation).toHaveBeenCalledOnce();
    expect(harness.bridge.setCombatState).toHaveBeenCalledWith("walking");
  });

  it("resumes gathering from progression frontier or the selected farm segment", () => {
    const progression = createHarness({ farmMode: false });
    progression.actions.prepareCombatResumeAfterGathering();
    expect(progression.worldRuntime.selectSegment).toHaveBeenCalledWith(6);

    const farming = createHarness({ farmMode: true });
    farming.actions.prepareCombatResumeAfterGathering();
    expect(farming.worldRuntime.selectSegment).toHaveBeenCalledWith(3);
  });

  it("includes the authoritative defeat lock in world location saves", () => {
    const harness = createHarness({ awaitingResumeAfterDefeat: true });

    const saved = harness.actions.getWorldLocationSaveState();

    expect(saved.awaitingResumeAfterDefeat).toBe(true);
    expect(harness.combatRuntime.isAwaitingResumeAfterDefeat).toHaveBeenCalledOnce();
  });

  it("restores saved location through authoritative runtimes", () => {
    const harness = createHarness();

    harness.actions.setWorldLocationSaveState(harness.savedLocation);

    expect(harness.worldRuntime.setWorldLocationSaveState)
      .toHaveBeenCalledWith(harness.savedLocation);
    expect(harness.combatRuntime.interruptEncounter).toHaveBeenCalledOnce();
    expect(harness.combatRuntime.restoreHeroHealth).toHaveBeenCalledOnce();
    expect(harness.combatRuntime.restoreAwaitingResumeAfterDefeat).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("restores a saved defeat without healing or restarting exploration", () => {
    const harness = createHarness({ savedDefeat: true });

    harness.actions.setWorldLocationSaveState(harness.savedLocation);

    expect(harness.worldRuntime.setWorldLocationSaveState)
      .toHaveBeenCalledWith(harness.savedLocation);
    expect(harness.combatRuntime.interruptEncounter).toHaveBeenCalledOnce();
    expect(harness.combatRuntime.restoreAwaitingResumeAfterDefeat).toHaveBeenCalledOnce();
    expect(harness.combatRuntime.restoreHeroHealth).not.toHaveBeenCalled();
    expect(harness.bridge.setCombatState).toHaveBeenLastCalledWith("defeat");
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });
});
