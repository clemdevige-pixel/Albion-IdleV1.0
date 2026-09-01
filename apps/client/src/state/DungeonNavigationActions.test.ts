import { describe, expect, it, vi } from "vitest";
import type { CombatLoopState } from "../runtime/CombatRuntime.js";
import { DungeonNavigationActions, resolveDungeonAccessState } from "./DungeonNavigationActions.js";

const AVAILABLE_FACTS = {
  definitionTier: 4,
  researchUnlocked: true,
  progressionUnlocked: true,
  hasWeapon: true,
  highestEquippedTier: 4,
  hasKey: true,
} as const;

function createNavigationHarness(loopState: CombatLoopState = "combat") {
  let paused = false;
  const dungeonRuntime = {
    activeRun: { status: "active" },
    abandon: vi.fn(),
    getClearedTiers: vi.fn(() => []),
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
  const actions = new DungeonNavigationActions({
    dungeonRuntime: dungeonRuntime as never,
    inventoryManager: {} as never,
    equipmentManager: {} as never,
    heroId: "hero" as never,
    combatRuntime,
    stopController,
    bridge: {} as never,
    isCombatSuspended: () => false,
    canStartDungeon: () => true,
    canAccessDungeonContent: () => true,
    onStateChanged,
  });

  return {
    actions,
    dungeonRuntime,
    combatRuntime,
    stopController,
    onStateChanged,
    reachPausedState: () => { paused = true; },
  };
}

describe("resolveDungeonAccessState", () => {
  it("uses the shared access priority for Research, progression, equipment, weapon and key gates", () => {
    expect(resolveDungeonAccessState({ ...AVAILABLE_FACTS, researchUnlocked: false })).toEqual({
      canEnter: false,
      reason: "research_locked",
    });
    expect(resolveDungeonAccessState({ ...AVAILABLE_FACTS, progressionUnlocked: false })).toEqual({
      canEnter: false,
      reason: "progression_locked",
      previousTier: 3,
    });
    expect(resolveDungeonAccessState({ ...AVAILABLE_FACTS, highestEquippedTier: 5 })).toEqual({
      canEnter: false,
      reason: "equipment_tier_locked",
      highestEquippedTier: 5,
    });
    expect(resolveDungeonAccessState({ ...AVAILABLE_FACTS, hasWeapon: false })).toEqual({
      canEnter: false,
      reason: "weapon_required",
    });
    expect(resolveDungeonAccessState({ ...AVAILABLE_FACTS, hasKey: false })).toEqual({
      canEnter: false,
      reason: "missing_key",
    });
    expect(resolveDungeonAccessState(AVAILABLE_FACTS)).toEqual({
      canEnter: true,
      reason: "available",
    });
  });

  it("fails closed for an unknown dungeon definition", () => {
    expect(resolveDungeonAccessState({
      researchUnlocked: true,
      progressionUnlocked: true,
      hasWeapon: true,
      hasKey: true,
    })).toEqual({
      canEnter: false,
      reason: "invalid_definition",
    });
  });
});

describe("DungeonNavigationActions combat priority", () => {
  it("defers dungeon abandon until the current encounter reaches the stable paused state", () => {
    const harness = createNavigationHarness("combat");

    expect(harness.actions.abandon()).toBe(true);
    expect(harness.stopController.requestStopAfterEncounter).toHaveBeenCalledOnce();
    expect(harness.dungeonRuntime.abandon).not.toHaveBeenCalled();
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();
    expect(harness.onStateChanged).toHaveBeenCalledOnce();

    expect(harness.actions.flushPendingStart()).toBe(false);
    expect(harness.dungeonRuntime.abandon).not.toHaveBeenCalled();
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();

    harness.reachPausedState();
    expect(harness.actions.flushPendingStart()).toBe(true);
    expect(harness.dungeonRuntime.abandon).toHaveBeenCalledOnce();
    expect(harness.combatRuntime.interruptEncounter).toHaveBeenCalledOnce();
    expect(harness.stopController.reset).toHaveBeenCalledOnce();
  });

  it("does not request a second stop when combat is already stopping", () => {
    const harness = createNavigationHarness("stop_requested");

    expect(harness.actions.abandon()).toBe(true);
    expect(harness.stopController.requestStopAfterEncounter).not.toHaveBeenCalled();
    expect(harness.dungeonRuntime.abandon).not.toHaveBeenCalled();
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();
  });
});
