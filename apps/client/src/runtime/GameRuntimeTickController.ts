export interface GameRuntimeTickControllerDependencies {
  readonly tickIntervalMs: number;
  readonly deltaSeconds: number;
  readonly advanceTick: () => number;
  readonly tickConsumables: (deltaSeconds: number) => boolean;
  readonly syncConsumables: () => void;
  readonly tickProduction: (tick: number) => void;
  readonly syncActiveProduction: () => void;
  readonly tickParallelProgression: (elapsedMs: number) => void;
  readonly isHeroGathering: () => boolean;
  readonly presentGatheringState: () => void;
  readonly syncProjectedSegmentRates: () => void;
  readonly updateZoneElapsed: (seconds: number) => void;
  readonly tickCombat: (deltaSeconds: number, tick: number) => void;
}

/** Sequences runtime clocks without owning any gameplay or presentation state. */
export class GameRuntimeTickController {
  readonly #dependencies: GameRuntimeTickControllerDependencies;
  #elapsedMilliseconds = 0;

  constructor(dependencies: GameRuntimeTickControllerDependencies) {
    this.#dependencies = dependencies;
  }

  tick(): void {
    const tick = this.#dependencies.advanceTick();
    if (this.#dependencies.tickConsumables(this.#dependencies.deltaSeconds)) {
      this.#dependencies.syncConsumables();
    }
    this.#dependencies.tickProduction(tick);
    this.#dependencies.syncActiveProduction();
    this.#dependencies.tickParallelProgression(this.#dependencies.tickIntervalMs);

    if (this.#dependencies.isHeroGathering()) {
      this.#dependencies.presentGatheringState();
      return;
    }

    this.#dependencies.syncProjectedSegmentRates();
    this.#elapsedMilliseconds += this.#dependencies.tickIntervalMs;
    this.#dependencies.updateZoneElapsed(this.#elapsedMilliseconds / 1000);
    this.#dependencies.tickCombat(this.#dependencies.deltaSeconds, tick);
  }
}
