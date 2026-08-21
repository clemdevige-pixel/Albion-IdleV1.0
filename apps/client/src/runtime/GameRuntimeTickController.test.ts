import { describe, expect, it, vi } from "vitest";
import { GameRuntimeTickController } from "./GameRuntimeTickController";

function createDependencies(overrides: {
  readonly gathering?: boolean;
  readonly consumableChanged?: boolean;
} = {}) {
  let tick = 0;
  return {
    tickIntervalMs: 500,
    deltaSeconds: 0.5,
    advanceTick: vi.fn(() => {
      tick += 1;
      return tick;
    }),
    tickConsumables: vi.fn(() => overrides.consumableChanged ?? false),
    syncConsumables: vi.fn(),
    tickProduction: vi.fn(),
    syncActiveProduction: vi.fn(),
    tickParallelProgression: vi.fn(),
    isHeroGathering: vi.fn(() => overrides.gathering ?? false),
    presentGatheringState: vi.fn(),
    syncProjectedSegmentRates: vi.fn(),
    updateZoneElapsed: vi.fn(),
    tickCombat: vi.fn(),
  };
}

describe("GameRuntimeTickController", () => {
  it("keeps production and parallel progression running but suspends combat while the hero gathers", () => {
    const dependencies = createDependencies({ gathering: true });
    const controller = new GameRuntimeTickController(dependencies);

    controller.tick();

    expect(dependencies.tickProduction).toHaveBeenCalledWith(1);
    expect(dependencies.syncActiveProduction).toHaveBeenCalledOnce();
    expect(dependencies.tickParallelProgression).toHaveBeenCalledWith(500);
    expect(dependencies.presentGatheringState).toHaveBeenCalledOnce();
    expect(dependencies.tickCombat).not.toHaveBeenCalled();
    expect(dependencies.updateZoneElapsed).not.toHaveBeenCalled();
  });

  it("advances parallel progression, elapsed time and combat when gathering is inactive", () => {
    const dependencies = createDependencies({ consumableChanged: true });
    const controller = new GameRuntimeTickController(dependencies);

    controller.tick();
    controller.tick();

    expect(dependencies.syncConsumables).toHaveBeenCalledTimes(2);
    expect(dependencies.tickParallelProgression).toHaveBeenCalledTimes(2);
    expect(dependencies.tickParallelProgression).toHaveBeenNthCalledWith(1, 500);
    expect(dependencies.tickParallelProgression).toHaveBeenNthCalledWith(2, 500);
    expect(dependencies.syncProjectedSegmentRates).toHaveBeenCalledTimes(2);
    expect(dependencies.updateZoneElapsed).toHaveBeenNthCalledWith(1, 0.5);
    expect(dependencies.updateZoneElapsed).toHaveBeenNthCalledWith(2, 1);
    expect(dependencies.tickCombat).toHaveBeenNthCalledWith(1, 0.5, 1);
    expect(dependencies.tickCombat).toHaveBeenNthCalledWith(2, 0.5, 2);
  });
});
