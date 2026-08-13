type InvalidationListener = () => void;

let generation = 0;
let damageEventCutoff = 0;
const listeners = new Set<InvalidationListener>();

export function getCombatPresentationGeneration(): number {
  return generation;
}

export function getCombatPresentationDamageEventCutoff(): number {
  return damageEventCutoff;
}

export function invalidateCombatPresentation(cutoffDamageEventId = damageEventCutoff): void {
  generation += 1;
  damageEventCutoff = Math.max(damageEventCutoff, cutoffDamageEventId);
  for (const listener of listeners) listener();
}

export function subscribeCombatPresentationInvalidation(
  listener: InvalidationListener,
): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
