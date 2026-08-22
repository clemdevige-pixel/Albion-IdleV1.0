import { describe, expect, it, vi } from "vitest";
import { createBackgroundProgressionFoundation } from "./createBackgroundProgressionFoundation.js";

describe("createBackgroundProgressionFoundation", () => {
  it("fails closed when no trusted elapsed time is available", () => {
    const advancePassiveFactionProgression = vi.fn();
    const saveResolvedState = vi.fn();
    const foundation = createBackgroundProgressionFoundation({
      getTrustedElapsedMs: () => 0,
      advancePassiveFactionProgression,
      saveResolvedState,
    });

    expect(foundation.resolveAfterLoad()).toEqual({ elapsedMs: 0, resolved: false });
    expect(advancePassiveFactionProgression).not.toHaveBeenCalled();
    expect(saveResolvedState).not.toHaveBeenCalled();
  });

  it("advances passive faction progression once and persists the resolved state", () => {
    const advancePassiveFactionProgression = vi.fn();
    const saveResolvedState = vi.fn();
    const foundation = createBackgroundProgressionFoundation({
      getTrustedElapsedMs: () => 7_200_000,
      advancePassiveFactionProgression,
      saveResolvedState,
    });

    expect(foundation.resolveAfterLoad()).toEqual({ elapsedMs: 7_200_000, resolved: true });
    expect(advancePassiveFactionProgression).toHaveBeenCalledTimes(1);
    expect(advancePassiveFactionProgression).toHaveBeenCalledWith(7_200_000);
    expect(saveResolvedState).toHaveBeenCalledTimes(1);
  });
});
