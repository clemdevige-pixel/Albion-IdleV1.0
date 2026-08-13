type InvalidationListener = () => void;

let generation = 0;
const listeners = new Set<InvalidationListener>();

export function getCombatPresentationGeneration(): number {
  return generation;
}

export function invalidateCombatPresentation(): void {
  generation += 1;
  for (const listener of listeners) listener();
}

export function subscribeCombatPresentationInvalidation(
  listener: InvalidationListener,
): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
