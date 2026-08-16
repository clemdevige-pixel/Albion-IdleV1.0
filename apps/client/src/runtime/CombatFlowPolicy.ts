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

/** Existing world-exploration behavior, now explicit instead of hard-coded. */
export const WORLD_COMBAT_FLOW_POLICY: CombatFlowPolicy = {
  shouldRestoreHeroHealthBeforeEncounter: ({ locationChangedAfterVictory, enteringBoss }) =>
    locationChangedAfterVictory || enteringBoss,
  shouldResetHeroCooldownsOnEncounterStart: ({ encounterIndex }) => encounterIndex === 0,
};

/**
 * Dungeon V1 contract: one continuous expedition. HP and cooldowns persist
 * between every encounter, including the boss transition.
 */
export const CONTINUOUS_COMBAT_FLOW_POLICY: CombatFlowPolicy = {
  shouldRestoreHeroHealthBeforeEncounter: () => false,
  shouldResetHeroCooldownsOnEncounterStart: () => false,
};
