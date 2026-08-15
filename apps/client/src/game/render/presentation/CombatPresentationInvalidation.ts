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

/**
 * Starts a fresh presentation session for a specific GameBridge instance.
 *
 * GameBridge damage ids restart at 1 when a new game/service graph is created,
 * while this module can survive that transition in the SPA. Therefore the
 * cutoff must be allowed to move backwards at a bridge boundary. Using the
 * bridge's latest existing event as the baseline also prevents stale events
 * from replaying when a presentation scene is recreated for an existing game.
 */
export function resetCombatPresentationSession(latestBridgeDamageEventId = 0): void {
  generation += 1;
  damageEventCutoff = Math.max(0, latestBridgeDamageEventId);
  for (const listener of listeners) listener();
}

export function subscribeCombatPresentationInvalidation(
  listener: InvalidationListener,
): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
