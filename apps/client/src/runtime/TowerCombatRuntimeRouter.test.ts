import { describe, expect, it } from "vitest";
import { TowerProgressionService } from "@game/gameplay";
import { TowerCombatEncounterSource } from "./TowerCombatEncounterSource.js";
import { TowerCombatRuntimeRouter } from "./TowerCombatRuntimeRouter.js";

function createRouter(): {
  readonly progression: TowerProgressionService;
  readonly router: TowerCombatRuntimeRouter;
} {
  const progression = new TowerProgressionService("tower-router-seed");
  return {
    progression,
    router: new TowerCombatRuntimeRouter(
      progression,
      new TowerCombatEncounterSource(progression),
    ),
  };
}

describe("TowerCombatRuntimeRouter", () => {
  it("falls through while Tower is inactive", () => {
    const { router } = createRouter();
    expect(router.isTowerActive()).toBe(false);
    expect(router.getEncounterIndex(3)).toBe(3);
    expect(router.onVictory(() => ({ enteredNewSegment: true }))).toEqual({ enteredNewSegment: true });
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

  it("returns to the block checkpoint and exits Tower on defeat", () => {
    const { progression, router } = createRouter();
    for (let floor = 1; floor <= 7; floor += 1) progression.clearCurrentFloor(floor);
    expect(progression.getSnapshot()).toMatchObject({ currentFloor: 8, checkpointFloor: 6 });

    router.start();
    let fallbackCalled = false;
    router.onDefeat(() => { fallbackCalled = true; });

    expect(fallbackCalled).toBe(false);
    expect(router.isTowerActive()).toBe(false);
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
