export interface CombatEncounterTransitionContext {
  readonly locationChangedAfterVictory: boolean;
  readonly enteringBoss: boolean;
}

export interface CombatEncounterStartContext {
  readonly encounterIndex: number;
}

export interface CombatFlowPolicy {
  readonly shouldRestoreHeroHealthBeforeEncounter: (
    context: CombatEncounterTransitionContext,
  ) => boolean;
  readonly shouldResetHeroCooldownsOnEncounterStart: (
    context: CombatEncounterStartContext,
  ) => boolean;
}

/**
 * World contract: a segment is one continuous five-encounter endurance sequence.
 * HP is restored only after progression moves to a new segment/zone, never before
 * encounter 5 (elite or S10 biome boss).
 */
export const WORLD_COMBAT_FLOW_POLICY: CombatFlowPolicy = {
  shouldRestoreHeroHealthBeforeEncounter: ({ locationChangedAfterVictory }) =>
    locationChangedAfterVictory,
  shouldResetHeroCooldownsOnEncounterStart: ({ encounterIndex }) => encounterIndex === 0,
};

/**
 * Dungeon V1 contract: HP and cooldowns persist through the full dungeon endurance
 * sequence after the run starts. Cooldowns reset only for the first encounter so
 * entering a dungeon always begins with the authored weapon rotation available.
 */
export const CONTINUOUS_COMBAT_FLOW_POLICY: CombatFlowPolicy = {
  shouldRestoreHeroHealthBeforeEncounter: () => false,
  shouldResetHeroCooldownsOnEncounterStart: ({ encounterIndex }) => encounterIndex === 0,
};
