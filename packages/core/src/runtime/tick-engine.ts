/**
 * Tick engine — the discrete simulation counter.
 *
 * A tick is one indivisible unit of simulation progress. The engine is
 * intentionally independent of the game loop and the clock: it only counts.
 */
export class TickEngine {
  #currentTick = 0;

  /** The number of ticks elapsed since the last {@link reset}. */
  get currentTick(): number {
    return this.#currentTick;
  }

  /** Advances by one tick and returns the new value. */
  advance(): number {
    this.#currentTick += 1;
    return this.#currentTick;
  }

  /** Resets the counter to zero. */
  reset(): void {
    this.#currentTick = 0;
  }
}
