import { describe, expect, it, vi } from "vitest";
import { TowerProgressionService } from "@game/gameplay";
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

  it("closes the attempt and requests a pause after a completed block", () => {
    const requestPauseAfterEncounter = vi.fn(() => true);
    const { progression, router } = createRouter({ requestPauseAfterEncounter });
    expect(router.start()).toBe(true);

    for (let floor = 1; floor < 5; floor += 1) {
      expect(router.onVictory(() => ({ enteredNewSegment: false }))).toEqual({
        enteredNewSegment: false,
      });
      expect(router.isTowerActive()).toBe(true);
      expect(progression.getSnapshot().currentFloor).toBe(floor + 1);
      expect(requestPauseAfterEncounter).not.toHaveBeenCalled();
    }

    expect(router.onVictory(() => ({ enteredNewSegment: false }))).toEqual({
      enteredNewSegment: true,
    });
    expect(router.isTowerActive()).toBe(false);
    expect(progression.getSnapshot()).toMatchObject({
      currentFloor: 6,
      highestClearedFloor: 5,
      checkpointFloor: 6,
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
