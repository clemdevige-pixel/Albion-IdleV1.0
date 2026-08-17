import { afterEach, describe, expect, it } from "vitest";
import { combatStopController } from "./CombatStopController";

describe("CombatStopController", () => {
  afterEach(() => {
    combatStopController.reset();
  });

  it("transitions from running to paused at the current encounter boundary", () => {
    expect(combatStopController.requestStopAfterEncounter()).toBe(true);
    expect(combatStopController.getState()).toBe("stop_requested");

    expect(combatStopController.pauseAfterEncounter()).toBe(true);
    expect(combatStopController.getState()).toBe("paused");
  });

  it("resets a paused combat lifecycle back to running", () => {
    expect(combatStopController.requestStopAfterEncounter()).toBe(true);
    expect(combatStopController.pauseAfterEncounter()).toBe(true);
    expect(combatStopController.getState()).toBe("paused");

    combatStopController.reset();

    expect(combatStopController.getState()).toBe("running");
    expect(combatStopController.isPaused()).toBe(false);
  });

  it("resets a pending stop request back to running", () => {
    expect(combatStopController.requestStopAfterEncounter()).toBe(true);
    expect(combatStopController.getState()).toBe("stop_requested");

    combatStopController.reset();

    expect(combatStopController.getState()).toBe("running");
  });
});
