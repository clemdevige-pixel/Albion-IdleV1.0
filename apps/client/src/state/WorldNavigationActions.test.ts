import { describe, expect, it, vi } from "vitest";
import type { WorldLocationSaveState } from "@game/gameplay";
import type { CombatLoopState } from "../runtime/CombatRuntime";
import { WorldNavigationActions } from "./WorldNavigationActions";

function createHarness(options?: {
  readonly segmentAccepted?: boolean;
  readonly zoneAccepted?: boolean;
  readonly explorationResumed?: boolean;
  readonly farmMode?: boolean;
  readonly loopState?: CombatLoopState;
  readonly awaitingResumeAfterDefeat?: boolean;
  readonly savedDefeat?: boolean;
  readonly savedPaused?: boolean;
}) {
  const savedLocation = {
    activeZoneDefId: "zone_forest",
    activeSegment: 2,
    activeEncounter: 3,
    farmMode: false,
    zoneMemories: [],
    ...(options?.savedDefeat === true ? { awaitingResumeAfterDefeat: true } : {}),
    ...(options?.savedPaused === true ? { combatPaused: true } : {}),
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
    restorePausedState: vi.fn(),
    resumeExploration: vi.fn(() => options?.explorationResumed ?? true),
    isAwaitingResumeAfterDefeat: vi.fn(() => options?.awaitingResumeAfterDefeat ?? false),
    restoreAwaitingResumeAfterDefeat: vi.fn(),
    getLoopState: vi.fn((): CombatLoopState => options?.loopState ?? "combat"),
  };
  const bridge = {
    setCombatState: vi.fn(),
    clearEnemyPresentation: vi.fn(),
    addEconomyNotification: vi.fn(),
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

describe("WorldNavigationActions", () => {
  it("queues an accepted manual segment change while combat is active", () => {
    const harness = createHarness({ loopState: "combat" });

    expect(harness.actions.selectSegment(4)).toBe(true);
    expect(harness.worldRuntime.queueSegmentChange).toHaveBeenCalledWith(4);
    expect(harness.worldRuntime.selectSegment).not.toHaveBeenCalled();
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("applies a segment selection immediately while combat is paused", () => {
    const harness = createHarness({ loopState: "paused" });

    expect(harness.actions.selectSegment(4)).toBe(true);
    expect(harness.worldRuntime.selectSegment).toHaveBeenCalledWith(4);
    expect(harness.combatRuntime.restoreHeroHealth).toHaveBeenCalledOnce();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("lets WorldRuntime validate cross-zone travel without any equipment-tier cap", () => {
    const harness = createHarness({ loopState: "paused" });

    // Golden Steppe is a lower-tier World destination. World navigation no longer
    // inspects equipped item tier; progression/unlock validation stays in WorldRuntime.
    expect(harness.actions.selectZone(4, 1)).toBe(true);
    expect(harness.worldRuntime.selectZone).toHaveBeenCalledWith(4, 1);
    expect(harness.worldRuntime.changeActiveZone).toHaveBeenCalledWith(3, 0);
    expect(harness.bridge.addEconomyNotification).not.toHaveBeenCalled();
  });

  it("still rejects a cross-zone destination rejected by WorldRuntime", () => {
    const harness = createHarness({ loopState: "paused", zoneAccepted: false });

    expect(harness.actions.selectZone(4, 1)).toBe(false);
    expect(harness.worldRuntime.changeActiveZone).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).not.toHaveBeenCalled();
  });

  it("queues accepted cross-zone travel without interrupting active combat", () => {
    const harness = createHarness({ loopState: "combat" });

    expect(harness.actions.selectZone(3, 2)).toBe(true);
    expect(harness.worldRuntime.selectZone).toHaveBeenCalledWith(3, 2);
    expect(harness.worldRuntime.changeActiveZone).not.toHaveBeenCalled();
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("resumes gathering from progression frontier or the selected farm segment", () => {
    const progression = createHarness({ farmMode: false });
    progression.actions.prepareCombatResumeAfterGathering();
    expect(progression.worldRuntime.selectSegment).toHaveBeenCalledWith(6);

    const farming = createHarness({ farmMode: true });
    farming.actions.prepareCombatResumeAfterGathering();
    expect(farming.worldRuntime.selectSegment).toHaveBeenCalledWith(3);
  });

  it("persists authoritative defeat and pause locks", () => {
    const defeat = createHarness({ awaitingResumeAfterDefeat: true, loopState: "defeat" });
    expect(defeat.actions.getWorldLocationSaveState().awaitingResumeAfterDefeat).toBe(true);

    const paused = createHarness({ loopState: "paused" });
    expect(paused.actions.getWorldLocationSaveState().combatPaused).toBe(true);
  });

  it("restores a saved pause without forcing combat to resume", () => {
    const harness = createHarness({ savedPaused: true });

    harness.actions.setWorldLocationSaveState(harness.savedLocation);

    expect(harness.worldRuntime.setWorldLocationSaveState).toHaveBeenCalledWith(harness.savedLocation);
    expect(harness.combatRuntime.restoreHeroHealth).toHaveBeenCalledOnce();
    expect(harness.combatRuntime.restorePausedState).toHaveBeenCalledOnce();
    expect(harness.bridge.setCombatState).toHaveBeenLastCalledWith("idle");
  });

  it("restores a saved defeat without healing or restarting exploration", () => {
    const harness = createHarness({ savedDefeat: true });

    harness.actions.setWorldLocationSaveState(harness.savedLocation);

    expect(harness.combatRuntime.restoreAwaitingResumeAfterDefeat).toHaveBeenCalledOnce();
    expect(harness.combatRuntime.restoreHeroHealth).not.toHaveBeenCalled();
    expect(harness.bridge.setCombatState).toHaveBeenLastCalledWith("defeat");
  });
});
