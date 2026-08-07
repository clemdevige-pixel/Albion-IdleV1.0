export const SEGMENTS_PER_ZONE = 10;
export const ENCOUNTERS_PER_SEGMENT = 5;
export const ENCOUNTER_DIFFICULTY_GROWTH = 0.025;
export const REWARD_RANKS_PER_ZONE = 5;

export const WORLD_ONE_COMBAT_CURVE = [
  { healthStart: 1, healthEnd: 1.9, damageStart: 1.3, damageEnd: 2.4, defenseStart: 1, defenseEnd: 1.15 },
  { healthStart: 1.9, healthEnd: 2.25, damageStart: 2.35, damageEnd: 2.65, defenseStart: 1.15, defenseEnd: 1.3 },
  { healthStart: 2.25, healthEnd: 2.7, damageStart: 2.6, damageEnd: 3.05, defenseStart: 1.3, defenseEnd: 1.5 },
  { healthStart: 2.7, healthEnd: 3.4, damageStart: 3, damageEnd: 3.8, defenseStart: 1.5, defenseEnd: 1.75 },
  { healthStart: 3.4, healthEnd: 4.3, damageStart: 3.75, damageEnd: 4.8, defenseStart: 1.75, defenseEnd: 2.1 },
] as const;
