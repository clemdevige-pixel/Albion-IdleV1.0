/**
 * Deterministic pseudo-random number generator.
 *
 * Same seed ⇒ same sequence, always. No `Math.random()` anywhere in the engine;
 * all randomness flows through this service so simulations stay reproducible.
 *
 * Algorithm: mulberry32 — small, fast, good enough for game simulation.
 */
export interface Rng {
  /** A float in [0, 1). */
  nextFloat(): number;
  /** An integer in [minInclusive, maxExclusive). Throws if the range is empty. */
  nextInt(minInclusive: number, maxExclusive: number): number;
  /** Returns a new array with the elements of `items` shuffled (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[];
  /** Returns one element of `items`. Throws if `items` is empty. */
  pick<T>(items: readonly T[]): T;
}

export class Mulberry32Rng implements Rng {
  #state: number;

  constructor(seed: number) {
    // Keep the state in the unsigned 32-bit range.
    this.#state = seed >>> 0;
  }

  nextFloat(): number {
    this.#state = (this.#state + 0x6d2b79f5) | 0;
    let t = this.#state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(minInclusive: number, maxExclusive: number): number {
    if (!Number.isInteger(minInclusive) || !Number.isInteger(maxExclusive)) {
      throw new RangeError(
        `nextInt expects integer bounds, got [${minInclusive}, ${maxExclusive})`,
      );
    }
    if (maxExclusive <= minInclusive) {
      throw new RangeError(`nextInt requires max > min, got [${minInclusive}, ${maxExclusive})`);
    }
    const span = maxExclusive - minInclusive;
    return minInclusive + Math.floor(this.nextFloat() * span);
  }

  shuffle<T>(items: readonly T[]): T[] {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = this.nextInt(0, i + 1);
      const a = result[i] as T;
      const b = result[j] as T;
      result[i] = b;
      result[j] = a;
    }
    return result;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new RangeError("pick requires a non-empty array");
    }
    return items[this.nextInt(0, items.length)] as T;
  }
}
