import { describe, expect, it } from "vitest";
import {
  WORLD_TRAVEL_BLACKOUT_TOTAL_MS,
  WORLD_TRAVEL_TOTAL_MS,
  WorldTravelTransitionController,
} from "./WorldTravelTransition";

describe("WorldTravelTransitionController", () => {
  it("blocks combat for the complete authored walk transition duration", () => {
    const transition = new WorldTravelTransitionController();

    expect(transition.isActive()).toBe(false);
    transition.start();
    expect(transition.isActive()).toBe(true);
    expect(transition.getMode()).toBe("walk");

    transition.advance(WORLD_TRAVEL_TOTAL_MS - 1);
    expect(transition.isActive()).toBe(true);

    transition.advance(1);
    expect(transition.isActive()).toBe(false);
  });

  it("consumes a blackout-only intent for the next authoritative travel", () => {
    const transition = new WorldTravelTransitionController();

    transition.requestNextMode("blackout");
    transition.start();

    expect(transition.getMode()).toBe("blackout");
    transition.advance(WORLD_TRAVEL_BLACKOUT_TOTAL_MS - 1);
    expect(transition.isActive()).toBe(true);
    transition.advance(1);
    expect(transition.isActive()).toBe(false);

    transition.start();
    expect(transition.getMode()).toBe("walk");
  });

  it("restarts cleanly and exposes a new presentation generation", () => {
    const transition = new WorldTravelTransitionController();

    transition.start();
    const firstGeneration = transition.getGeneration();
    transition.advance(WORLD_TRAVEL_TOTAL_MS);
    transition.start();

    expect(transition.getGeneration()).toBe(firstGeneration + 1);
    expect(transition.isActive()).toBe(true);

    transition.reset();
    expect(transition.isActive()).toBe(false);
    expect(transition.getMode()).toBe("walk");
  });
});
