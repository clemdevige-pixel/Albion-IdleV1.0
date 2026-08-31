import { isRuntimePresentationSuppressed } from "./RuntimePresentationSuppression.js";

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
    const presentationSuppressed = isRuntimePresentationSuppressed();
    const tick = this.#dependencies.advanceTick();
    const consumableChanged = this.#dependencies.tickConsumables(this.#dependencies.deltaSeconds);
    if (consumableChanged && !presentationSuppressed) {
      this.#dependencies.syncConsumables();
    }
    this.#dependencies.tickProduction(tick);
    if (!presentationSuppressed) {
      this.#dependencies.syncActiveProduction();
    }
    this.#dependencies.tickParallelProgression(this.#dependencies.tickIntervalMs);

    if (this.#dependencies.isHeroGathering()) {
      if (!presentationSuppressed) {
        this.#dependencies.presentGatheringState();
      }
      return;
    }

    if (!presentationSuppressed) {
      this.#dependencies.syncProjectedSegmentRates();
    }
    this.#elapsedMilliseconds += this.#dependencies.tickIntervalMs;
    if (!presentationSuppressed) {
      this.#dependencies.updateZoneElapsed(this.#elapsedMilliseconds / 1000);
    }
    this.#dependencies.tickCombat(this.#dependencies.deltaSeconds, tick);
  }
}
