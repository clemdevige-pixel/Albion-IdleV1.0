/**
 * Identifier strategy shared across the engine.
 *
 * IDs are deterministic (monotonic counter, never derived from time or randomness)
 * and strongly typed through branding so distinct id kinds cannot be mixed up.
 */

/** Brands a primitive `T` with a compile-time-only tag `B`. */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/** Deterministic, monotonic factory of branded numeric ids. */
export interface IdFactory<TId extends number> {
  /** Returns the next id and advances the counter. */
  next(): TId;
  /** Returns the value the next call to {@link next} would produce, without advancing. */
  peek(): number;
  /** Resets the counter to its initial value. */
  reset(): void;
}

/**
 * Creates a monotonic id factory starting at `start` (default `1`).
 *
 * `0` is intentionally avoided so it can serve as a "no entity" sentinel later.
 */
export function createMonotonicIdFactory<TId extends number>(start = 1): IdFactory<TId> {
  let counter = start;
  return {
    next(): TId {
      // Branding a plain number into the branded subtype; safe by construction.
      const value = counter as TId;
      counter += 1;
      return value;
    },
    peek(): number {
      return counter;
    },
    reset(): void {
      counter = start;
    },
  };
}
