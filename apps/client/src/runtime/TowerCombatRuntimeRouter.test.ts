import { afterEach, describe, expect, it, vi } from "vitest";
import { TowerProgressionService } from "@game/gameplay";
import { activityFailureFlow } from "./ActivityFailureFlow.js";
import { towerBlockCompletionFlow } from "./TowerBlockCompletionFlow.js";
import { TowerCombatEncounterSource } from "./TowerCombatEncounterSource.js";
import {
  TowerCombatRuntimeRouter,
  type TowerBlockTransitionPort,
} from "./TowerCombatRuntimeRouter.js";

function createRouter(blockTransitionPort?: TowerBlockTransitionPort): {
  readonly progression: TowerProgressionService;
  readonly router: TowerCombatRuntimeRouter;
} {
  const progression = new TowerProgressionService("tower-router-seed");
  return {
    progression,
    router: new TowerCombatRuntimeRouter(
      progression,
      new TowerCombatEncounterSource(progression),
      blockTransitionPort,
    ),
  };
}

afterEach(() => {
  activityFailureFlow.dismiss();
  towerBlockCompletionFlow.dismiss();
});

describe("TowerCombatRuntimeRouter", () => {
  it("falls through while Tower is inactive", () => {
    const { router } = createRouter();
    expect(router.isTowerActive()).toBe(false);
    expect(router.getFactionCombatContext()).toBeUndefined();
    expect(router.getEncounterIndex(3)).toBe(3);
    expect(router.onVictory(() => ({ enteredNewSegment: true }))).toEqual({ enteredNewSegment: true });
  });

  it("exposes the current authored Tower faction context while active", () => {
    const { router } = createRouter();
    router.start();
    expect(router.getFactionCombatContext()).toEqual({ factionId: "keeper", tier: 8 });
  });

  it("advances the authoritative Tower floor on victory", () => {
    const { progression, router } = createRouter();
    expect(router.start()).toBe(true);
    expect(router.start()).toBe(false);

    expect(router.onVictory(() => ({ enteredNewSegment: true }))).toEqual({ enteredNewSegment: false });
    expect(progression.getSnapshot()).toMatchObject({
      currentFloor: 2,
      highestClearedFloor: 1,
      checkpointFloor: 1,
    });
    expect(router.isTowerActive()).toBe(true);
    expect(router.getEncounterIndex(4)).toBe(1);
  });

  it("closes the attempt, exposes the next block and requests a pause after a completed block", () => {
    const requestPauseAfterEncounter = vi.fn(() => true);
    const { progression, router } = createRouter({ requestPauseAfterEncounter });
    expect(router.start()).toBe(true);

    for (let floor = 1; floor < 5; floor += 1) {
      expect(router.onVictory(() => ({ enteredNewSegment: false }))).toEqual({ enteredNewSegment: false });
      expect(router.isTowerActive()).toBe(true);
      expect(progression.getSnapshot().currentFloor).toBe(floor + 1);
      expect(requestPauseAfterEncounter).not.toHaveBeenCalled();
    }

    expect(router.onVictory(() => ({ enteredNewSegment: false }))).toEqual({ enteredNewSegment: true });
    expect(router.isTowerActive()).toBe(false);
    expect(progression.getSnapshot()).toMatchObject({
      currentFloor: 6,
      highestClearedFloor: 5,
      checkpointFloor: 6,
    });
    expect(towerBlockCompletionFlow.getSnapshot()).toMatchObject({
      floorStart: 1,
      floorEnd: 5,
      checkpointFloor: 6,
      nextFloor: 6,
      unlockedEndlessNow: false,
    });
    expect(requestPauseAfterEncounter).toHaveBeenCalledTimes(1);
  });

  it("unlocks Endless and marks the major milestone after floor 25", () => {
    const requestPauseAfterEncounter = vi.fn(() => true);
    const { progression, router } = createRouter({ requestPauseAfterEncounter });
    for (let floor = 1; floor <= 24; floor += 1) progression.clearCurrentFloor(floor);

    expect(router.start()).toBe(true);
    expect(router.onVictory(() => ({ enteredNewSegment: false }))).toEqual({ enteredNewSegment: true });
    expect(router.isTowerActive()).toBe(false);
    expect(progression.getSnapshot()).toMatchObject({
      currentFloor: 26,
      highestClearedFloor: 25,
      checkpointFloor: 26,
      endlessUnlocked: true,
    });
    expect(towerBlockCompletionFlow.getSnapshot()).toMatchObject({
      floorEnd: 25,
      nextFloor: 26,
      checkpointFloor: 26,
      endlessUnlocked: true,
      unlockedEndlessNow: true,
    });
    expect(requestPauseAfterEncounter).toHaveBeenCalledTimes(1);
  });

  it("returns to the block checkpoint and exits Tower on defeat", () => {
    const { progression, router } = createRouter();
    for (let floor = 1; floor <= 7; floor += 1) progression.clearCurrentFloor(floor);
    expect(progression.getSnapshot()).toMatchObject({ currentFloor: 8, checkpointFloor: 6 });

    router.start();
    let fallbackCalled = false;
    router.onDefeat(() => { fallbackCalled = true; });

    expect(fallbackCalled).toBe(false);
    expect(router.isTowerActive()).toBe(false);
    expect(router.getFactionCombatContext()).toBeUndefined();
    expect(progression.getSnapshot()).toMatchObject({ currentFloor: 6, checkpointFloor: 6 });
  });

  it("returns to the selected Endless checkpoint after defeat", () => {
    const { progression, router } = createRouter();
    for (let floor = 1; floor <= 32; floor += 1) progression.clearCurrentFloor(floor);
    progression.selectCheckpoint(31);
    progression.clearCurrentFloor(31);
    progression.clearCurrentFloor(32);
    expect(progression.getSnapshot()).toMatchObject({
      currentFloor: 33,
      highestClearedFloor: 32,
      checkpointFloor: 31,
      endlessUnlocked: true,
    });

    expect(router.start()).toBe(true);
    let fallbackCalled = false;
    router.onDefeat(() => { fallbackCalled = true; });

    expect(fallbackCalled).toBe(false);
    expect(router.isTowerActive()).toBe(false);
    expect(progression.getSnapshot()).toMatchObject({
      currentFloor: 31,
      highestClearedFloor: 32,
      checkpointFloor: 31,
      endlessUnlocked: true,
    });
  });

  it("supports explicit abandon without mutating progression", () => {
    const { progression, router } = createRouter();
    router.start();
    expect(router.abandon()).toBe(true);
    expect(router.abandon()).toBe(false);
    expect(progression.getSnapshot()).toMatchObject({
      currentFloor: 1,
      highestClearedFloor: 0,
      checkpointFloor: 1,
    });
  });
});
