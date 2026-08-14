import { afterEach, describe, expect, it } from "vitest";
import { combatStopController } from "./CombatStopController";

describe("CombatStopController", () => {
  afterEach(() => {
    combatStopController.reset();
  });

  it("resets a paused combat lifecycle back to running", () => {
    expect(combatStopController.requestStopAfterSegment()).toBe(true);
    expect(combatStopController.pauseAfterSegment()).toBe(true);
    expect(combatStopController.getState()).toBe("paused");

    combatStopController.reset();

    expect(combatStopController.getState()).toBe("running");
    expect(combatStopController.isPaused()).toBe(false);
  });

  it("resets a pending stop request back to running", () => {
    expect(combatStopController.requestStopAfterSegment()).toBe(true);
    expect(combatStopController.getState()).toBe("stop_requested");

    combatStopController.reset();

    expect(combatStopController.getState()).toBe("running");
  });
});
