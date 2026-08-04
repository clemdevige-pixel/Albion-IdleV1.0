/**
 * Branded type for nominal typing. Local to @game/data to avoid depending on @game/core.
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };
