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
  readonly equippedItemIds?: readonly string[];
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
    getEquippedItemIds: vi.fn(() => options?.equippedItemIds ?? []),
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
    expect(harness.combatRuntime.restoreHeroHealth).not.toHaveBeenCalled();
    expect(harness.bridge.setCombatState).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("keeps a manual segment change queued while stop has been requested", () => {
    const harness = createHarness({ loopState: "stop_requested" });

    expect(harness.actions.selectSegment(4)).toBe(true);
    expect(harness.worldRuntime.queueSegmentChange).toHaveBeenCalledWith(4);
    expect(harness.worldRuntime.selectSegment).not.toHaveBeenCalled();
  });

  it("applies a segment selection immediately while combat is paused and restores hero health", () => {
    const harness = createHarness({ loopState: "paused" });

    expect(harness.actions.selectSegment(4)).toBe(true);
    expect(harness.worldRuntime.selectSegment).toHaveBeenCalledWith(4);
    expect(harness.worldRuntime.queueSegmentChange).not.toHaveBeenCalled();
    expect(harness.combatRuntime.restoreHeroHealth).toHaveBeenCalledOnce();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("applies a segment selection immediately after defeat without driving enemy presentation", () => {
    const harness = createHarness({ loopState: "defeat" });

    expect(harness.actions.selectSegment(2)).toBe(true);
    expect(harness.worldRuntime.selectSegment).toHaveBeenCalledWith(2);
    expect(harness.worldRuntime.queueSegmentChange).not.toHaveBeenCalled();
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();
    expect(harness.bridge.clearEnemyPresentation).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("queues timeline travel inside the active zone during active combat", () => {
    const harness = createHarness({ loopState: "combat" });

    expect(harness.actions.selectZone(1, 4)).toBe(true);
    expect(harness.worldRuntime.selectZone).toHaveBeenCalledWith(1, 4);
    expect(harness.worldRuntime.selectSegment).not.toHaveBeenCalled();
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();
    expect(harness.combatRuntime.restoreHeroHealth).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("applies same-zone timeline travel immediately after defeat without driving enemy presentation", () => {
    const harness = createHarness({ loopState: "defeat" });

    expect(harness.actions.selectZone(1, 4)).toBe(true);
    expect(harness.worldRuntime.selectZone).toHaveBeenCalledWith(1, 4);
    expect(harness.worldRuntime.selectSegment).toHaveBeenCalledWith(4);
    expect(harness.worldRuntime.changeActiveZone).not.toHaveBeenCalled();
    expect(harness.bridge.clearEnemyPresentation).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("applies validated cross-zone travel immediately while paused and restores hero health", () => {
    const harness = createHarness({ loopState: "paused" });

    expect(harness.actions.selectZone(3, 2)).toBe(true);
    expect(harness.worldRuntime.selectZone).toHaveBeenCalledWith(3, 2);
    expect(harness.worldRuntime.changeActiveZone).toHaveBeenCalledWith(2, 1);
    expect(harness.combatRuntime.restoreHeroHealth).toHaveBeenCalledOnce();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("refuses cross-zone travel when any equipped item exceeds the target zone tier cap", () => {
    const harness = createHarness({
      loopState: "paused",
      equippedItemIds: ["item_weapon_sword_t5_broadsword"],
    });

    // Zone 4 is Golden Steppe (T4): a T5 item invalidates the whole travel request.
    expect(harness.actions.selectZone(4, 1)).toBe(false);
    expect(harness.worldRuntime.selectZone).not.toHaveBeenCalled();
    expect(harness.worldRuntime.changeActiveZone).not.toHaveBeenCalled();
    expect(harness.bridge.addEconomyNotification).toHaveBeenCalledOnce();
  });

  it("accepts cross-zone travel when every equipped item respects the target zone tier cap", () => {
    const harness = createHarness({
      loopState: "paused",
      equippedItemIds: ["item_weapon_sword_t4_broadsword"],
    });

    expect(harness.actions.selectZone(4, 1)).toBe(true);
    expect(harness.worldRuntime.selectZone).toHaveBeenCalledWith(4, 1);
    expect(harness.worldRuntime.changeActiveZone).toHaveBeenCalledWith(3, 0);
    expect(harness.bridge.addEconomyNotification).not.toHaveBeenCalled();
  });

  it("does not alter combat when a manual segment destination is rejected", () => {
    const harness = createHarness({ segmentAccepted: false });

    expect(harness.actions.selectSegment(9)).toBe(false);
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();
    expect(harness.combatRuntime.restoreHeroHealth).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).not.toHaveBeenCalled();
  });

  it("queues accepted cross-zone travel without interrupting active combat", () => {
    const harness = createHarness({ loopState: "combat" });

    expect(harness.actions.selectZone(3, 2)).toBe(true);
    expect(harness.worldRuntime.selectZone).toHaveBeenCalledWith(3, 2);
    expect(harness.worldRuntime.changeActiveZone).not.toHaveBeenCalled();
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();
    expect(harness.combatRuntime.restoreHeroHealth).not.toHaveBeenCalled();
    expect(harness.bridge.setCombatState).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("resumes exploration without directly mutating enemy presentation", () => {
    const harness = createHarness({ loopState: "defeat", explorationResumed: true });

    expect(harness.actions.resumeExploration()).toBe(true);
    expect(harness.combatRuntime.resumeExploration).toHaveBeenCalledOnce();
    expect(harness.bridge.clearEnemyPresentation).not.toHaveBeenCalled();
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

  it("includes authoritative defeat and pause locks in world location saves", () => {
    const defeat = createHarness({ awaitingResumeAfterDefeat: true, loopState: "defeat" });
    expect(defeat.actions.getWorldLocationSaveState().awaitingResumeAfterDefeat).toBe(true);

    const paused = createHarness({ loopState: "paused" });
    expect(paused.actions.getWorldLocationSaveState().combatPaused).toBe(true);
    expect(paused.combatRuntime.getLoopState).toHaveBeenCalled();
  });

  it("restores saved location through authoritative runtimes", () => {
    const harness = createHarness();

    harness.actions.setWorldLocationSaveState(harness.savedLocation);

    expect(harness.worldRuntime.setWorldLocationSaveState)
      .toHaveBeenCalledWith(harness.savedLocation);
    expect(harness.combatRuntime.interruptEncounter).toHaveBeenCalledOnce();
    expect(harness.combatRuntime.restoreHeroHealth).toHaveBeenCalledOnce();
    expect(harness.combatRuntime.restoreAwaitingResumeAfterDefeat).not.toHaveBeenCalled();
    expect(harness.combatRuntime.restorePausedState).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("restores a saved pause without forcing combat to resume", () => {
    const harness = createHarness({ savedPaused: true });

    harness.actions.setWorldLocationSaveState(harness.savedLocation);

    expect(harness.worldRuntime.setWorldLocationSaveState)
      .toHaveBeenCalledWith(harness.savedLocation);
    expect(harness.combatRuntime.interruptEncounter).toHaveBeenCalledOnce();
    expect(harness.combatRuntime.restoreHeroHealth).toHaveBeenCalledOnce();
    expect(harness.combatRuntime.restorePausedState).toHaveBeenCalledOnce();
    expect(harness.combatRuntime.restoreAwaitingResumeAfterDefeat).not.toHaveBeenCalled();
    expect(harness.bridge.setCombatState).toHaveBeenLastCalledWith("idle");
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
    expect(harness.combatRuntime.restorePausedState).not.toHaveBeenCalled();
    expect(harness.bridge.setCombatState).toHaveBeenLastCalledWith("defeat");
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });
});
