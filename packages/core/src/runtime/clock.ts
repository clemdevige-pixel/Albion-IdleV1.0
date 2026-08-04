/**
 * Read model of simulation time.
 *
 * Every part of the engine reads time from here — never from `Date.now()` or
 * `performance.now()`. Time only moves when the loop advances the clock, which
 * keeps the simulation deterministic and framerate-independent.
 */
export interface Clock {
  /** Simulation time of the most recent step, in milliseconds. */
  readonly deltaTime: number;
  /** Total simulation time elapsed, in milliseconds. */
  readonly simulationTime: number;
  /** Total simulation time elapsed, in seconds. */
  readonly elapsedTime: number;
  /** Tick index mirrored from the tick engine at the last advance. */
  readonly currentTick: number;
}

/** Mutable clock advanced by the game loop. */
export class SimulationClock implements Clock {
  #deltaTime = 0;
  #simulationTime = 0;
  #currentTick = 0;

  get deltaTime(): number {
    return this.#deltaTime;
  }

  get simulationTime(): number {
    return this.#simulationTime;
  }

  get elapsedTime(): number {
    return this.#simulationTime / 1000;
  }

  get currentTick(): number {
    return this.#currentTick;
  }

  /** Advances simulation time by `deltaMs` and records the given tick index. */
  advance(deltaMs: number, tick: number): void {
    this.#deltaTime = deltaMs;
    this.#simulationTime += deltaMs;
    this.#currentTick = tick;
  }

  /** Resets all time back to zero. */
  reset(): void {
    this.#deltaTime = 0;
    this.#simulationTime = 0;
    this.#currentTick = 0;
  }
}
