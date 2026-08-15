let segmentStartGeneration = 0;

/**
 * Marks the authoritative start of a combat segment.
 * Consumers snapshot the generation so stale events from another runtime
 * instance cannot be replayed when a new game session is created.
 */
export function markCombatSegmentStart(): void {
  segmentStartGeneration += 1;
}

export function getCombatSegmentStartGeneration(): number {
  return segmentStartGeneration;
}
