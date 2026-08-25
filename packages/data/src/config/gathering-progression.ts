/** Canonical authored gathering mastery identifiers. */
export const GATHERING_MASTERY_ID_VALUES = {
  wood: "mastery_gathering_wood",
  ore: "mastery_gathering_ore",
  hide: "mastery_gathering_hide",
  fiber: "mastery_gathering_fiber",
} as const;

export const GATHERING_MASTERY_MAX_LEVEL = 100;

/** Mastery level required to actively gather each production tier. */
export const GATHERING_MASTERY_UNLOCK_BY_TIER = {
  3: 0,
  4: 3,
  5: 7,
  6: 11,
  7: 18,
  8: 25,
} as const;

/** Authored XP rewards per completed gathering cycle. */
export const HERO_GATHERING_XP_BY_TIER = {
  3: 5,
  4: 8,
  5: 13,
  6: 20,
  7: 33,
  8: 52,
} as const;

/** Authored worker mastery XP rewards per completed worker cycle. */
export const WORKER_GATHERING_XP_BY_TIER = {
  3: 4,
  4: 6,
  5: 9,
  6: 14,
  7: 20,
  8: 30,
} as const;

/** Hero gathering mastery XP granted by a completed worker cycle. */
export const HERO_GATHERING_XP_FROM_WORKER_BY_TIER = {
  3: 2,
  4: 3,
  5: 4,
  6: 7,
  7: 10,
  8: 15,
} as const;

export type GatheringProgressionTier = keyof typeof GATHERING_MASTERY_UNLOCK_BY_TIER;
