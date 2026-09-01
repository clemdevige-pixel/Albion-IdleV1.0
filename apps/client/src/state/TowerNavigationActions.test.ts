import { describe, expect, it, vi } from "vitest";
import type { CombatLoopState } from "../runtime/CombatRuntime.js";
import { TowerNavigationActions, resolveTowerAccessState } from "./TowerNavigationActions.js";

function createNavigationHarness(loopState: CombatLoopState = "combat") {
  let paused = false;
  const towerRouter = {
    isTowerEngaged: vi.fn(() => true),
    abandon: vi.fn(() => true),
  };
  const combatRuntime = {
    getLoopState: vi.fn((): CombatLoopState => loopState),
    interruptEncounter: vi.fn(),
  };
  const stopController = {
    isPaused: vi.fn(() => paused),
    requestStopAfterEncounter: vi.fn(() => true),
    reset: vi.fn(),
  };
  const onStateChanged = vi.fn();
  const actions = new TowerNavigationActions({
    progression: {} as never,
    towerRouter: towerRouter as never,
    activityRouter: {} as never,
    equipmentManager: {} as never,
    heroId: "hero" as never,
    combatRuntime,
    stopController,
    bridge: {} as never,
    isCombatSuspended: () => false,
    isTowerUnlocked: () => true,
    onStateChanged,
  });

  return {
    actions,
    towerRouter,
    combatRuntime,
    stopController,
    onStateChanged,
    reachPausedState: () => { paused = true; },
  };
}

describe("resolveTowerAccessState", () => {
  it("accepts matching or lower-tier equipment", () => {
    expect(resolveTowerAccessState({
      requiredTier: 6,
      researchUnlocked: true,
      activityAvailable: true,
      hasWeapon: true,
      highestEquippedTier: 6,
    })).toEqual({
      canEnter: true,
      reason: "available",
      requiredTier: 6,
      highestEquippedTier: 6,
    });

    expect(resolveTowerAccessState({
      requiredTier: 6,
      researchUnlocked: true,
      activityAvailable: true,
      hasWeapon: true,
      highestEquippedTier: 5,
    }).canEnter).toBe(true);
  });

  it("re-evaluates the authored tier cap when the next block is lower tier", () => {
    expect(resolveTowerAccessState({
      requiredTier: 8,
      researchUnlocked: true,
      activityAvailable: true,
      hasWeapon: true,
      highestEquippedTier: 8,
    }).canEnter).toBe(true);

    expect(resolveTowerAccessState({
      requiredTier: 6,
      researchUnlocked: true,
      activityAvailable: true,
      hasWeapon: true,
      highestEquippedTier: 8,
    })).toEqual({
      canEnter: false,
      reason: "equipment_tier_locked",
      requiredTier: 6,
      highestEquippedTier: 8,
    });
  });

  it("applies the same cap when revisiting a historical checkpoint", () => {
    expect(resolveTowerAccessState({
      requiredTier: 4,
      researchUnlocked: true,
      activityAvailable: true,
      hasWeapon: true,
      highestEquippedTier: 7,
    })).toEqual({
      canEnter: false,
      reason: "equipment_tier_locked",
      requiredTier: 4,
      highestEquippedTier: 7,
    });
  });

  it("preserves research, activity and weapon gates before tier validation", () => {
    expect(resolveTowerAccessState({
      requiredTier: 8,
      researchUnlocked: false,
      activityAvailable: true,
      hasWeapon: true,
      highestEquippedTier: 8,
    }).reason).toBe("research_locked");

    expect(resolveTowerAccessState({
      requiredTier: 8,
      researchUnlocked: true,
      activityAvailable: false,
      hasWeapon: true,
      highestEquippedTier: 8,
    }).reason).toBe("activity_busy");

    expect(resolveTowerAccessState({
      requiredTier: 8,
      researchUnlocked: true,
      activityAvailable: true,
      hasWeapon: false,
    }).reason).toBe("weapon_required");
  });
});

describe("TowerNavigationActions combat priority", () => {
  it("defers tower abandon until the current encounter reaches the stable paused state", () => {
    const harness = createNavigationHarness("combat");

    expect(harness.actions.abandon()).toBe(true);
    expect(harness.stopController.requestStopAfterEncounter).toHaveBeenCalledOnce();
    expect(harness.towerRouter.abandon).not.toHaveBeenCalled();
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();
    expect(harness.onStateChanged).toHaveBeenCalledOnce();

    expect(harness.actions.flushPendingStart()).toBe(false);
    expect(harness.towerRouter.abandon).not.toHaveBeenCalled();
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();

    harness.reachPausedState();
    expect(harness.actions.flushPendingStart()).toBe(true);
    expect(harness.towerRouter.abandon).toHaveBeenCalledOnce();
    expect(harness.combatRuntime.interruptEncounter).toHaveBeenCalledOnce();
    expect(harness.stopController.reset).toHaveBeenCalledOnce();
  });

  it("does not request a second stop when combat is already stopping", () => {
    const harness = createNavigationHarness("stop_requested");

    expect(harness.actions.abandon()).toBe(true);
    expect(harness.stopController.requestStopAfterEncounter).not.toHaveBeenCalled();
    expect(harness.towerRouter.abandon).not.toHaveBeenCalled();
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();
  });
});
